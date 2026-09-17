# Shared FastAPI dependencies used by the routers.
# Provides a StashClient bound to the process-wide pooled httpx client so every
# request reuses the same connection pool instead of opening new sockets.

from fastapi import Request

from ..stash_client import StashClient


# Builds a StashClient around the shared httpx.AsyncClient stored on app.state.
def get_stash(request: Request) -> StashClient:
    return StashClient(request.app.state.http)
