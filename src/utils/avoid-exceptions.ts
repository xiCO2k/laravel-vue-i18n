export const avoidException = (callback: Function, param, defaults = {}) => {
  try {
    return callback(param)
  } catch {
    return defaults
  }
}

export const avoidExceptionOnPromise = async (promise, defaults = {}) => {
  try {
    return (await promise).default || defaults
  } catch (e) {
    return defaults
  }
}
