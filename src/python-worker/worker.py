import pika
import json
import time

connection = pika.BlockingConnection(
    pika.ConnectionParameters("localhost")
)
channel = connection.channel()

EXCHANGE = "app.events"

# declare exchange (IMPORTANT)
channel.exchange_declare(exchange=EXCHANGE, exchange_type="direct")

# consume from job queue
channel.queue_declare(queue="transcription.jobs", durable=True)

channel.queue_bind(
    exchange=EXCHANGE,
    queue="transcription.jobs",
    routing_key="transcription.request"
)

def callback(ch, method, properties, body):
    data = json.loads(body)
    print("Received:", data)

    time.sleep(5)  # simulate heavy work

    result = {
        "jobId": data["jobId"],
        "status": "DONE",
        "resultText": f"[processed] {data['sourceText']}"
    }

    # send result back via exchange
    channel.basic_publish(
        exchange=EXCHANGE,
        routing_key="transcription.result",
        body=json.dumps(result)
    )

    print("Processed:", result)

    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(
    queue="transcription.jobs",
    on_message_callback=callback
)

print("Worker started...")
channel.start_consuming()