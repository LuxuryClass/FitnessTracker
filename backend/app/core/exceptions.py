class AppException(Exception):
    pass


class NotFoundException(AppException):
    pass


class AlreadyExistsException(AppException):
    pass


class ForbiddenException(AppException):
    pass


class UnauthorizedException(AppException):
    pass


class BadRequestException(AppException):
    pass
