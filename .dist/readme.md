Compose middleware function originated from thread on github https://github.com/dbartholomae/lambda-middleware/pull/73

This package does not provided it's own ready to use middlewares, you need to write all by your own.

However you may want to consider using those from `lambda-middleware` if you have reasons to not write your own middleware functions. (I don't recommend that since those packages are not so commonly used)

## Warning

`event` may have `unknown` type and it's known `typescript` bug which often happens whhile composing. To fix types remove `event` variable and write it back. (`ctrl + x` and `ctrl + v`)

## Examples

### Example of usage composeMiddlewares function
```ts
export const handle = composeMiddlewares(
  middlewareErrorHandler(),
  middlewareLogger(),
  middlewareJsonParser(),
  middlewareValidator(lambdaSchemaPackageActivate), // infer types from validator
  middlewareLoadDependencies(["repositoryPackage"]), // infer types from DI
  async (event) => {
    const existingPackage = await event.dependencies.repositoryPackage.findPackage({
      packageName: event.jsonBody.packageName,
    });
    if (existingPackage === null) {
      throw new ConflictError("package must exists in database");
    }
    if (existingPackage.packageStatus === PackageStatus.active) {
      throw new ConflictError("package.packageStatus must not equal active");
    }
    await event.dependencies.repositoryPackage.changePackageStatus({
      packageName: event.jsonBody.packageName,
      packageStatus: PackageStatus.active,
    });
    return awsLambdaResponse(StatusCodes.OK, {}, {});
  },
);
```

### Example of middleware for logging events from within lambda using winston
```ts
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { winstonLogger } from "../logger/logger";

export const middlewareLogger =
  <TApiGatewayProxyEvent extends APIGatewayProxyEvent>() =>
  (
    handler: (event: TApiGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>,
  ): ((event: TApiGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>) =>
  async (event, context) => {
    winstonLogger.info(`Incoming lambda event -> ${JSON.stringify(event)}`);
    const result = await handler(event, context);
    winstonLogger.info(`Outgoing lambda result -> ${JSON.stringify(result)}`);
    return result;
  };

```

### Example of middleware implementation using zod as validation library to pass types from the validator into handler automatically.
```ts
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { ZodError, ZodTypeAny } from "zod";
import { BadRequestError } from "../error/bad-request.error";
import type { zod } from "../zod";

export type ValidatedFields = "headers" | "jsonBody" | "queryStringParameters" | "pathParameters";

export type EndpointSchema = {
  [key in ValidatedFields]: ZodTypeAny;
};

export const middlewareValidator =
  <TApiGatewayProxyEvent extends APIGatewayProxyEvent, TEndpointSchema extends EndpointSchema>(
    endpointSchema: TEndpointSchema,
  ) =>
  (
    handler: (
      event: TApiGatewayProxyEvent & {
        jsonBody: zod.infer<TEndpointSchema["jsonBody"]>;
        headers: zod.infer<TEndpointSchema["headers"]>;
        pathParameters: zod.infer<TEndpointSchema["pathParameters"]>;
        queryStringParameters: zod.infer<TEndpointSchema["queryStringParameters"]>;
      },
      context: Context,
    ) => Promise<APIGatewayProxyResult>,
  ): ((
    event: TApiGatewayProxyEvent & {
      jsonBody: zod.infer<TEndpointSchema["jsonBody"]>;
      headers: zod.infer<TEndpointSchema["headers"]>;
      pathParameters: zod.infer<TEndpointSchema["pathParameters"]>;
      queryStringParameters: zod.infer<TEndpointSchema["queryStringParameters"]>;
    },
    context: Context,
  ) => Promise<APIGatewayProxyResult>) =>
  async (event, context) => {
    const errors = Object.entries(endpointSchema).reduce((acc, [key, schema]) => {
      const validationResult = schema.safeParse(event[key as ValidatedFields]);
      if (validationResult.success === false) {
        acc[key as ValidatedFields] = validationResult.error.issues;
        return acc;
      } else {
        acc[key as ValidatedFields] = [] as any;
      }
      event[key as ValidatedFields] = validationResult.data as any;
      return acc;
    }, {} as { [key in ValidatedFields]: ZodError["issues"] });
    if (Object.values(errors).flat().length > 0) {
      throw new BadRequestError(errors);
    }
    const result = await handler(event, context);
    return result;
  };
```