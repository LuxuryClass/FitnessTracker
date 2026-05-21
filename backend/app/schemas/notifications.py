from pydantic import BaseModel, ConfigDict, Field, model_validator


class NotificationSettings(BaseModel):
    enabled: bool
    sound: bool
    vibration: bool
    do_not_disturb: bool
    reminders: bool
    reminder_offset_minutes: int = Field(ge=0, le=1440)

    model_config = ConfigDict(from_attributes=True)


class NotificationSettingsUpdateRequest(BaseModel):
    enabled: bool | None = None
    sound: bool | None = None
    vibration: bool | None = None
    do_not_disturb: bool | None = None
    reminders: bool | None = None
    reminder_offset_minutes: int | None = Field(default=None, ge=0, le=1440)

    @model_validator(mode="after")
    def validate_payload(self) -> "NotificationSettingsUpdateRequest":
        if not self.model_fields_set:
            raise ValueError("Нужно передать хотя бы одно поле для обновления настроек.")
        return self


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys


class PushSubscriptionDeleteRequest(BaseModel):
    endpoint: str


class VapidPublicKeyResponse(BaseModel):
    public_key: str
