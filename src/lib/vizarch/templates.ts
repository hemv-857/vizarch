// vizarch — Preset architecture templates
// Provides "Quick start" diagram templates that users can load with one click.

export interface TemplateNode {
  id: string;
  service: string;   // matches ServiceMeta.id
  label?: string;     // optional override
  layer?: number;     // optional layer hint for layout
}

export interface TemplateEdge {
  from: string;       // node id
  to: string;          // node id
  protocol?: string;  // e.g. "https", "postgres"
  label?: string;
}

export interface ArchTemplate {
  id: string;
  name: string;
  description: string;
  // Plain-English description (also fed to LLM parser if user wants to vary)
  text: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

export const TEMPLATES: ArchTemplate[] = [
  {
    id: "serverless-aws",
    name: "Serverless (AWS)",
    description: "CloudFront → API Gateway → Lambda → DynamoDB + S3 + SNS",
    text:
      "React frontend on CloudFront CDN, API Gateway, Lambda compute, DynamoDB database, S3 storage, SNS notifications, CloudWatch monitoring",
    nodes: [
      { id: "n1", service: "generic.frontend", label: "React SPA" },
      { id: "n2", service: "aws.cloudfront", label: "CloudFront CDN" },
      { id: "n3", service: "aws.api-gateway", label: "API Gateway" },
      { id: "n4", service: "aws.lambda", label: "Lambda Functions" },
      { id: "n5", service: "aws.dynamodb", label: "DynamoDB" },
      { id: "n6", service: "aws.s3", label: "S3 (Assets)" },
      { id: "n7", service: "aws.sns", label: "SNS Notifications" },
      { id: "n8", service: "aws.cloudwatch", label: "CloudWatch" },
    ],
    edges: [
      { from: "n1", to: "n2", protocol: "https", label: "HTTPS" },
      { from: "n2", to: "n3", protocol: "https" },
      { from: "n3", to: "n4", protocol: "https", label: "Invoke" },
      { from: "n4", to: "n5", protocol: "db", label: "DynamoDB" },
      { from: "n4", to: "n6", protocol: "https", label: "S3 SDK" },
      { from: "n4", to: "n7", protocol: "event", label: "Publish" },
      { from: "n4", to: "n8", protocol: "direct", label: "Metrics" },
    ],
  },
  {
    id: "microservices-gke",
    name: "Microservices (GKE)",
    description: "Cloud Load Balancer → GKE → microservices → Cloud SQL + Pub/Sub",
    text:
      "Web frontend, Google Cloud Load Balancing, Google Kubernetes Engine with 3 microservices (auth, orders, payments), Cloud SQL Postgres, Pub/Sub events, Memorystore cache, Cloud Monitoring",
    nodes: [
      { id: "n1", service: "generic.frontend", label: "Web App" },
      { id: "n2", service: "gcp.loadbalancer", label: "Cloud LB" },
      { id: "n3", service: "gcp.gke", label: "GKE Cluster" },
      { id: "n4", service: "generic.microservice", label: "Auth Service" },
      { id: "n5", service: "generic.microservice", label: "Orders Service" },
      { id: "n6", service: "generic.microservice", label: "Payments Service" },
      { id: "n7", service: "gcp.cloudsql", label: "Cloud SQL" },
      { id: "n8", service: "gcp.pubsub", label: "Pub/Sub" },
      { id: "n9", service: "gcp.memorystore", label: "Memorystore" },
      { id: "n10", service: "gcp.cloudmonitoring", label: "Cloud Monitoring" },
    ],
    edges: [
      { from: "n1", to: "n2", protocol: "https" },
      { from: "n2", to: "n3", protocol: "https" },
      { from: "n3", to: "n4", protocol: "direct" },
      { from: "n3", to: "n5", protocol: "direct" },
      { from: "n3", to: "n6", protocol: "direct" },
      { from: "n4", to: "n7", protocol: "postgres" },
      { from: "n5", to: "n7", protocol: "postgres" },
      { from: "n5", to: "n9", protocol: "redis" },
      { from: "n5", to: "n8", protocol: "event", label: "Publish" },
      { from: "n6", to: "n8", protocol: "event", label: "Consume" },
      { from: "n4", to: "n10", protocol: "direct" },
      { from: "n5", to: "n10", protocol: "direct" },
    ],
  },
  {
    id: "monolith-aws",
    name: "Monolith (EC2)",
    description: "CloudFront → ELB → EC2 → RDS + ElastiCache + S3",
    text:
      "React frontend, CloudFront CDN, Elastic Load Balancer, EC2 monolith, RDS Postgres, ElastiCache Redis, S3 storage, CloudWatch monitoring",
    nodes: [
      { id: "n1", service: "generic.frontend", label: "React Frontend" },
      { id: "n2", service: "aws.cloudfront", label: "CloudFront" },
      { id: "n3", service: "aws.elb", label: "ELB" },
      { id: "n4", service: "aws.ec2", label: "EC2 Monolith" },
      { id: "n5", service: "aws.rds", label: "RDS Postgres" },
      { id: "n6", service: "aws.elasticache", label: "ElastiCache Redis" },
      { id: "n7", service: "aws.s3", label: "S3" },
      { id: "n8", service: "aws.cloudwatch", label: "CloudWatch" },
    ],
    edges: [
      { from: "n1", to: "n2", protocol: "https" },
      { from: "n2", to: "n3", protocol: "https" },
      { from: "n3", to: "n4", protocol: "https" },
      { from: "n4", to: "n5", protocol: "postgres" },
      { from: "n4", to: "n6", protocol: "redis" },
      { from: "n4", to: "n7", protocol: "https" },
      { from: "n4", to: "n8", protocol: "direct" },
    ],
  },
  {
    id: "fullstack-nextjs",
    name: "Fullstack (Next.js)",
    description: "Vercel → Next.js API → Postgres + Redis + Stripe",
    text:
      "Next.js frontend on Vercel, Next.js API routes, PostgreSQL database, Redis cache, Stripe payments, GitHub for CI/CD, Sentry for error tracking",
    nodes: [
      { id: "n1", service: "generic.vercel", label: "Vercel Hosting" },
      { id: "n2", service: "generic.frontend", label: "Next.js Frontend" },
      { id: "n3", service: "generic.api", label: "Next.js API Routes" },
      { id: "n4", service: "generic.postgres", label: "PostgreSQL" },
      { id: "n5", service: "generic.redis", label: "Redis Cache" },
      { id: "n6", service: "generic.stripe", label: "Stripe" },
      { id: "n7", service: "generic.github", label: "GitHub Actions" },
      { id: "n8", service: "generic.sentry", label: "Sentry" },
    ],
    edges: [
      { from: "n2", to: "n1", protocol: "https" },
      { from: "n2", to: "n3", protocol: "https" },
      { from: "n3", to: "n4", protocol: "postgres" },
      { from: "n3", to: "n5", protocol: "redis" },
      { from: "n3", to: "n6", protocol: "https", label: "Payments" },
      { from: "n7", to: "n1", protocol: "direct", label: "Deploy" },
      { from: "n3", to: "n8", protocol: "direct" },
    ],
  },
  {
    id: "k8s-platform",
    name: "Kubernetes Platform",
    description: "Ingress → Services → Deployments + PVC + Secrets",
    text:
      "Kubernetes cluster with Ingress, Services, Deployments (web, api, worker), PersistentVolumeClaims, Secrets, ConfigMaps, HPA autoscaling, Prometheus monitoring",
    nodes: [
      { id: "n1", service: "k8s.ingress", label: "Ingress" },
      { id: "n2", service: "k8s.service", label: "Web Service" },
      { id: "n3", service: "k8s.service", label: "API Service" },
      { id: "n4", service: "k8s.deployment", label: "Web Deployment" },
      { id: "n5", service: "k8s.deployment", label: "API Deployment" },
      { id: "n6", service: "k8s.deployment", label: "Worker Deployment" },
      { id: "n7", service: "k8s.pvc", label: "PVC (data)" },
      { id: "n8", service: "k8s.secret", label: "Secrets" },
      { id: "n9", service: "k8s.configmap", label: "ConfigMap" },
      { id: "n10", service: "k8s.hpa", label: "HPA" },
      { id: "n11", service: "generic.prometheus", label: "Prometheus" },
    ],
    edges: [
      { from: "n1", to: "n2", protocol: "https" },
      { from: "n1", to: "n3", protocol: "https" },
      { from: "n2", to: "n4", protocol: "direct" },
      { from: "n3", to: "n5", protocol: "direct" },
      { from: "n5", to: "n6", protocol: "event", label: "Queue" },
      { from: "n4", to: "n7", protocol: "direct" },
      { from: "n5", to: "n8", protocol: "direct" },
      { from: "n5", to: "n9", protocol: "direct" },
      { from: "n10", to: "n5", protocol: "direct", label: "Scale" },
      { from: "n4", to: "n11", protocol: "direct" },
    ],
  },
  {
    id: "event-driven-aws",
    name: "Event-Driven (AWS)",
    description: "API GW → Lambda → EventBridge → SQS → Workers + DynamoDB",
    text:
      "React frontend, API Gateway, Lambda order service, EventBridge event bus, SQS queue, Lambda worker, DynamoDB, S3, SES email, CloudWatch",
    nodes: [
      { id: "n1", service: "generic.frontend", label: "React App" },
      { id: "n2", service: "aws.api-gateway", label: "API Gateway" },
      { id: "n3", service: "aws.lambda", label: "Order Lambda" },
      { id: "n4", service: "aws.eventbridge", label: "EventBridge" },
      { id: "n5", service: "aws.sqs", label: "SQS Queue" },
      { id: "n6", service: "aws.lambda", label: "Worker Lambda" },
      { id: "n7", service: "aws.dynamodb", label: "DynamoDB" },
      { id: "n8", service: "aws.s3", label: "S3 Audit" },
      { id: "n9", service: "aws.ses", label: "SES Email" },
      { id: "n10", service: "aws.cloudwatch", label: "CloudWatch" },
    ],
    edges: [
      { from: "n1", to: "n2", protocol: "https" },
      { from: "n2", to: "n3", protocol: "https" },
      { from: "n3", to: "n4", protocol: "event", label: "Emit" },
      { from: "n4", to: "n5", protocol: "sqs", label: "Route" },
      { from: "n5", to: "n6", protocol: "sqs", label: "Poll" },
      { from: "n6", to: "n7", protocol: "db" },
      { from: "n6", to: "n8", protocol: "https" },
      { from: "n6", to: "n9", protocol: "https" },
      { from: "n6", to: "n10", protocol: "direct" },
    ],
  },
  {
    id: "data-lakehouse",
    name: "Data Lakehouse",
    description: "S3 data lake + Glue ETL + Redshift warehouse + Athena + QuickSight",
    text:
      "S3 data lake, AWS Glue ETL crawler, Redshift data warehouse, Athena interactive query, Kinesis streaming, Lambda ingest, QuickSight BI dashboards, CloudWatch monitoring",
    nodes: [
      { id: "n1", service: "aws.kinesis", label: "Kinesis Stream" },
      { id: "n2", service: "aws.lambda", label: "Ingest Lambda" },
      { id: "n3", service: "aws.s3", label: "S3 Data Lake" },
      { id: "n4", service: "aws.glue", label: "Glue ETL" },
      { id: "n5", service: "aws.redshift", label: "Redshift Warehouse" },
      { id: "n6", service: "aws.athena", label: "Athena Query" },
      { id: "n7", service: "aws.quicksight", label: "QuickSight BI" },
      { id: "n8", service: "aws.cloudwatch", label: "CloudWatch" },
    ],
    edges: [
      { from: "n1", to: "n2", protocol: "event", label: "Stream" },
      { from: "n2", to: "n3", protocol: "https", label: "Write" },
      { from: "n3", to: "n4", protocol: "direct", label: "Crawl" },
      { from: "n4", to: "n5", protocol: "direct", label: "Load" },
      { from: "n3", to: "n6", protocol: "https", label: "Query" },
      { from: "n5", to: "n7", protocol: "direct", label: "Visualize" },
      { from: "n6", to: "n7", protocol: "direct" },
      { from: "n2", to: "n8", protocol: "direct", label: "Metrics" },
    ],
  },
  {
    id: "rag-system",
    name: "GenAI RAG System",
    description: "Bedrock LLM + SageMaker embeddings + OpenSearch + Lambda + S3",
    text:
      "React chat frontend, API Gateway, Lambda orchestrator, Amazon Bedrock LLM, SageMaker embeddings, OpenSearch vector store, S3 documents, DynamoDB sessions, CloudWatch",
    nodes: [
      { id: "n1", service: "generic.frontend", label: "Chat UI" },
      { id: "n2", service: "aws.api-gateway", label: "API Gateway" },
      { id: "n3", service: "aws.lambda", label: "Orchestrator" },
      { id: "n4", service: "aws.bedrock", label: "Bedrock LLM" },
      { id: "n5", service: "aws.sagemaker", label: "SageMaker Embeddings" },
      { id: "n6", service: "generic.elasticsearch", label: "OpenSearch Vector DB" },
      { id: "n7", service: "aws.s3", label: "S3 Documents" },
      { id: "n8", service: "aws.dynamodb", label: "DynamoDB Sessions" },
      { id: "n9", service: "aws.cloudwatch", label: "CloudWatch" },
    ],
    edges: [
      { from: "n1", to: "n2", protocol: "https" },
      { from: "n2", to: "n3", protocol: "https" },
      { from: "n3", to: "n4", protocol: "https", label: "Generate" },
      { from: "n3", to: "n5", protocol: "https", label: "Embed query" },
      { from: "n5", to: "n6", protocol: "https", label: "Search" },
      { from: "n7", to: "n5", protocol: "https", label: "Ingest" },
      { from: "n3", to: "n8", protocol: "db", label: "Session" },
      { from: "n3", to: "n9", protocol: "direct", label: "Trace" },
    ],
  },
  {
    id: "event-streaming-kafka",
    name: "Event Streaming (Kafka)",
    description: "Producer → Kafka → Consumers + Elasticsearch + Grafana",
    text:
      "Node.js producer service, Apache Kafka cluster, 3 consumer services (analytics, notifications, audit), Elasticsearch search index, PostgreSQL state store, Grafana dashboards, Prometheus metrics",
    nodes: [
      { id: "n1", service: "generic.api", label: "Producer API" },
      { id: "n2", service: "generic.kafka", label: "Kafka Cluster" },
      { id: "n3", service: "generic.microservice", label: "Analytics Consumer" },
      { id: "n4", service: "generic.microservice", label: "Notifications Consumer" },
      { id: "n5", service: "generic.microservice", label: "Audit Consumer" },
      { id: "n6", service: "generic.elasticsearch", label: "Elasticsearch" },
      { id: "n7", service: "generic.postgres", label: "PostgreSQL" },
      { id: "n8", service: "generic.grafana", label: "Grafana" },
      { id: "n9", service: "generic.prometheus", label: "Prometheus" },
    ],
    edges: [
      { from: "n1", to: "n2", protocol: "event", label: "Produce" },
      { from: "n2", to: "n3", protocol: "event", label: "Consume" },
      { from: "n2", to: "n4", protocol: "event", label: "Consume" },
      { from: "n2", to: "n5", protocol: "event", label: "Consume" },
      { from: "n3", to: "n6", protocol: "https", label: "Index" },
      { from: "n4", to: "n7", protocol: "postgres", label: "State" },
      { from: "n5", to: "n7", protocol: "postgres" },
      { from: "n3", to: "n9", protocol: "direct", label: "Metrics" },
      { from: "n9", to: "n8", protocol: "direct", label: "Visualize" },
    ],
  },
  {
    id: "ml-pipeline",
    name: "ML Training Pipeline",
    description: "S3 → SageMaker training → Model registry → Endpoint → Lambda",
    text:
      "S3 training data, SageMaker training job, SageMaker model registry, SageMaker endpoint, Lambda inference, API Gateway, CloudWatch monitoring, ECR container registry, Step Functions orchestration",
    nodes: [
      { id: "n1", service: "aws.s3", label: "S3 Training Data" },
      { id: "n2", service: "aws.ecr", label: "ECR Container" },
      { id: "n3", service: "aws.stepfunctions", label: "Step Functions" },
      { id: "n4", service: "aws.sagemaker", label: "Training Job" },
      { id: "n5", service: "aws.sagemaker", label: "Model Registry" },
      { id: "n6", service: "aws.sagemaker", label: "Inference Endpoint" },
      { id: "n7", service: "aws.api-gateway", label: "API Gateway" },
      { id: "n8", service: "aws.lambda", label: "Lambda Preprocess" },
      { id: "n9", service: "aws.cloudwatch", label: "CloudWatch" },
    ],
    edges: [
      { from: "n1", to: "n4", protocol: "https", label: "Read data" },
      { from: "n2", to: "n4", protocol: "https", label: "Pull image" },
      { from: "n3", to: "n4", protocol: "direct", label: "Orchestrate" },
      { from: "n4", to: "n5", protocol: "direct", label: "Register" },
      { from: "n5", to: "n6", protocol: "direct", label: "Deploy" },
      { from: "n7", to: "n8", protocol: "https" },
      { from: "n8", to: "n6", protocol: "https", label: "Invoke" },
      { from: "n8", to: "n9", protocol: "direct", label: "Metrics" },
    ],
  },
];

export function getTemplateById(id: string): ArchTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
