function resSuccess(res, data = {}, statusCode = 200, message = "Success") {
  return res.status(statusCode).json({
    code: "OK",
    message,
    data,
  });
}

function resError(res, error = "Something went wrong", statusCode = 500) {
  return res.status(statusCode).json({
    code: "ERROR",
    error,
  });
}

module.exports = {
  resSuccess,
  resError,
};
