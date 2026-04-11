class AppException(Exception):
    status_code = 400
    default_detail = "Ошибка приложения."

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.default_detail
        super().__init__(self.detail)

class NotFoundException(AppException):
    status_code = 404
    default_detail = "Ресурс не найден."


class AlreadyExistsException(AppException):
    status_code = 409
    default_detail = "Ресурс уже существует."


class ForbiddenException(AppException):
    status_code = 403
    default_detail = "Доступ запрещен."


class UnauthorizedException(AppException):
    status_code = 401
    default_detail = "Пользователь не авторизован."


class BadRequestException(AppException):
    status_code = 400
    default_detail = "Некорректный запрос."
