# Centralised runtime configuration loaded from environment variables.
# Everything the backend needs to reach Stash and to describe itself to the
# frontend lives here, so no other module reads os.environ directly.

import os
import tempfile
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings container.

    STASH_INTERNAL_URL / STASH_API_KEY are secrets used only server-side to talk
    to Stash. STASH_EXTERNAL_URL and PAGE_SIZE are safe to expose to the browser
    and are served through the /api/config endpoint.
    """

    stash_internal_url: str = "http://localhost:9999"
    stash_api_key: str = ""
    stash_external_url: str = "http://localhost:9999"
    page_size: int = 60

    # Upper bounds for the shared httpx connection pool. Sized generously so many
    # simultaneous media streams can be proxied without starving each other.
    http_max_connections: int = 200
    http_max_keepalive: int = 50

    # Directory where the pre-rendered favicon PNGs are written at startup and
    # served from. Empty means a per-user temp subdirectory chosen at runtime.
    favicon_dir: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Resolves the favicon output directory, defaulting to a temp subdirectory when
    # unset so the app works without any extra configuration.
    @property
    def favicon_path(self) -> str:
        return self.favicon_dir or os.path.join(tempfile.gettempdir(), "stashhub-favicons")

    # Normalises the Stash base URL by stripping any trailing slash so path
    # joining never produces a double slash.
    @property
    def stash_base(self) -> str:
        return self.stash_internal_url.rstrip("/")


# Caches the Settings instance so the environment is parsed only once per process.
@lru_cache
def get_settings() -> Settings:
    return Settings()
