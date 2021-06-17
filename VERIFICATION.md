# Verification

## Create documents in ES

- Run the following commands to create `Job`, `JobCandidate`, `Interview`, `ResourceBooking`, `WorkPeriod`, `WorkPeriodPayment`, `Role` documents in ES.

  ``` bash
  # for Job
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.job.create < test/messages/taas.job.create.event.json
  # for JobCandidate
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.jobcandidate.create < test/messages/taas.jobcandidate.create.event.json
  # for Interview
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.interview.requested < test/messages/taas.interview.requested.event.json
  # for ResourceBooking
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.resourcebooking.create < test/messages/taas.resourcebooking.create.event.json
  # for WorkPeriod
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.workperiod.create < test/messages/taas.workperiod.create.event.json
  # for WorkPeriodPayment
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.workperiodpayment.create < test/messages/taas.workperiodpayment.create.event.json
  # for Role
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.role.requested < test/messages/taas.role.create.event.json
  ```

- Run `npm run view-data <model-name-here>` to see if documents were created.

## Update documents in ES
- Run the following commands to update `Job`, `JobCandidate`, `Interview`, `ResourceBooking`, `WorkPeriod`, `WorkPeriodPayment`, `Role` documents in ES.

  ``` bash
  # for Job
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.job.update < test/messages/taas.job.update.event.json
  # for JobCandidate
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.jobcandidate.update < test/messages/taas.jobcandidate.update.event.json
  # for Interview
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.interview.update < test/messages/taas.interview.update.event.json
  # for ResourceBooking
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.resourcebooking.update < test/messages/taas.resourcebooking.update.event.json
  # for WorkPeriod
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.workperiod.update < test/messages/taas.workperiod.update.event.json
  # for WorkPeriodPayment
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.workperiodpayment.update < test/messages/taas.workperiodpayment.update.event.json
  # for Role
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.role.update < test/messages/taas.role.update.event.json
  ```

- Run `npm run view-data <model-name-here>` to see if documents were updated.

## Delete documents in ES
- Run the following commands to delete `Job`, `JobCandidate`, `ResourceBooking`, `WorkPeriod`, `Role` documents in ES.

  ``` bash
  # for Job
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.job.delete < test/messages/taas.job.delete.event.json
  # for JobCandidate
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.jobcandidate.delete < test/messages/taas.jobcandidate.delete.event.json
  # for ResourceBooking
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.resourcebooking.delete < test/messages/taas.resourcebooking.delete.event.json
  # for WorkPeriod
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.workperiod.delete < test/messages/taas.workperiod.delete.event.json
  # for Role
  docker exec -i taas-es-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic taas.role.delete < test/messages/taas.role.delete.event.json
  ```

- Run `npm run view-data <model-name-here>` to see if documents were deleted.
