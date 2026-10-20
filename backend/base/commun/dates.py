"""Dates en base : TEXT ISO 8601 en UTC, suffixe Z, à la seconde
(`2026-09-25T14:03:12Z`). Conversions vers l'epoch pour l'interface."""
from __future__ import annotations

import calendar
import time

FORMAT = '%Y-%m-%dT%H:%M:%SZ'


def iso(epoch: float | None) -> str | None:
    """Date ISO UTC d'un epoch ; None reste None."""
    if epoch is None:
        return None
    return time.strftime(FORMAT, time.gmtime(epoch))


def maintenant() -> str:
    return time.strftime(FORMAT, time.gmtime())


def epoch(date: str | None) -> int | None:
    """Epoch d'une date ISO UTC ; None reste None."""
    if not date:
        return None
    return calendar.timegm(time.strptime(date, FORMAT))
