import json


def handler(event: dict, context) -> dict:
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(
            {"Hello, ": "Green / Blue Deployment!"}
        )
    }
