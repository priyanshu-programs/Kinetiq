from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance; attached to the app and used as a route decorator.
limiter = Limiter(key_func=get_remote_address)
