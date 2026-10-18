/** Wraps every successful JSON body in { success, data, meta }. A top-level `meta` key is lifted out. */
export const envelope = (_req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && body.success === undefined) {
      const { meta, ...data } = body;
      return json(meta ? { success: true, data, meta } : { success: true, data });
    }
    return json(body);
  };
  next();
};

export const notFound = (req, res) => res.status(404).json({ success: false, message: `Not found: ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.details;
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyValue || err.keyPattern || {}).join(', ')}`;
  } else if (err.name === 'ValidationError') {
    status = 422;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0].message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large (1 MB max)';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller' : err.message;
  }
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message, ...(errors && { errors }) });
};
