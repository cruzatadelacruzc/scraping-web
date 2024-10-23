import { ResponseHandler } from '@shared/response-handler';
import { Response } from 'express';

describe('ResponseHandler', () => {
  let res: Partial<Response>;
  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(), // Mock `status` to return `res`
      json: jest.fn(), // Mock `json` to capture the response
    };
  });

  it('should send a success response', () => {
    const data = { id: 1 };
    const message = 'Operation successful';

    ResponseHandler.success(res as Response, message, 200, data);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message,
      data,
    });
  });

  it('should send an error response', () => {
    const message = 'An error occurred';

    ResponseHandler.error(res as Response, message, 500);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message,
    });
  });

  it('should send a created response', () => {
    const data = { id: 2 };
    const message = 'Resource created';

    ResponseHandler.created(res as Response, message, data);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message,
      data,
    });
  });

  it('should send a 404 not found response', () => {
    const message = 'Resource not found';

    ResponseHandler.notFound(res as Response, message);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Resource not found',
    });
  });

  it('should send a 400 bad request response', () => {
    const message = 'Bad request';

    ResponseHandler.badRequest(res as Response, message);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message,
    });
  });
});
