import { composeMiddlewares } from "./compose-middlewares";

it("with no arguments | throws a TypeError if called without any arguments", () => {
  // @ts-expect-error
  expect(() => composeMiddlewares()).toThrow(
    new TypeError(
      "composeMiddlewares function requires at least 1 middleware and a target to be provided in function call",
    ),
  );
});

it("with one arguments | throws a TypeError if called with only one argument", () => {
  // @ts-expect-error
  expect(() => composeMiddlewares(jest.fn())).toThrow(
    new TypeError(
      "composeMiddlewares function requires at least 1 middleware and a target to be provided in function call",
    ),
  );
});

it("with two arguments | result contain plain handler as result property", () => {
  const mockHandler = () => {};
  const middlewareAResponse = {};
  const mockMiddlewareA = jest.fn().mockReturnValue(middlewareAResponse);
  const composeResponse = composeMiddlewares(mockMiddlewareA, mockHandler);

  expect(composeResponse.handler).toStrictEqual(mockHandler);
  expect(composeResponse).toBe(middlewareAResponse);
});

it("with two arguments | result does not contain plain handler as result property if result is not an object", () => {
  const mockHandler = () => {};
  const middlewareAResponse = "middleware-A-response";
  const mockMiddlewareA = jest.fn().mockReturnValue(middlewareAResponse);
  const composeResponse = composeMiddlewares(mockMiddlewareA, mockHandler);

  expect(composeResponse.handler).toStrictEqual(undefined);
  expect(composeResponse).toBe(middlewareAResponse);
});

it("with three arguments | calls the functions in order", () => {
  const handler = "mockHandler";
  const middlewareAResponse = "middleware-A-response";
  const mockMiddlewareA = jest.fn().mockReturnValue(middlewareAResponse);
  const middlewareBResponse = "middleware-B-response";
  const mockMiddlewareB = jest.fn().mockReturnValue(middlewareBResponse);
  const composeResponse = composeMiddlewares(mockMiddlewareB, mockMiddlewareA, handler);

  expect(mockMiddlewareA).toHaveBeenCalledWith(handler);
  expect(mockMiddlewareB).toHaveBeenCalledWith(middlewareAResponse);
  expect(composeResponse).toBe(middlewareBResponse);
});
