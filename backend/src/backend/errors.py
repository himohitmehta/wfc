from math import sqrt
from statistics import mean, quantiles


def compute_errors(picked, actuals):
    """Pair each picked forecast with the actual that starts on the same hour.

    `actuals` maps startTime -> MW. Error = forecast - actual, so positive means the forecast was too high.
    Hours with no actual yet are skipped.
    """
    return [
        {
            "startTime": p["startTime"],
            "publishTime": p["publishTime"],
            "forecast": p["generation"],
            "actual": actuals[p["startTime"]],
            "error": p["generation"] - actuals[p["startTime"]],
        }
        for p in picked
        if p["startTime"] in actuals
    ]


def summarise(errors):
    """Accuracy numbers for a list of errors (needs at least 2 hours for p90)."""
    signed = [e["error"] for e in errors]
    absolute = [abs(x) for x in signed]
    return {
        "hours": len(signed),
        "mae": mean(absolute),
        "bias": mean(signed),
        "rmse": sqrt(mean(x * x for x in signed)),
        # "inclusive" = same as numpy / Excel PERCENTILE.INC
        "p90": quantiles(absolute, n=10, method="inclusive")[-1],
        "max_abs": max(absolute),
        "biggest": max(errors, key=lambda e: abs(e["error"])),
    }
