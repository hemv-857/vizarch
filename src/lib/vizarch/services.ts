// vizarch — Service metadata library
// Maps service aliases to canonical service metadata (provider, type, icon glyph, color)
// Coverage: AWS (60+), GCP (40+), Azure (40+), Kubernetes (20+), Generic (15+)

export type ServiceProvider =
  | "aws"
  | "gcp"
  | "azure"
  | "kubernetes"
  | "generic";

export type ServiceType =
  | "compute"
  | "container"
  | "database"
  | "cache"
  | "storage"
  | "cdn"
  | "messaging"
  | "queue"
  | "networking"
  | "analytics"
  | "monitoring"
  | "security"
  | "ai"
  | "frontend"
  | "external"
  | "client";

export interface ServiceMeta {
  id: string;            // canonical id e.g. "aws.lambda"
  name: string;          // display name e.g. "AWS Lambda"
  provider: ServiceProvider;
  type: ServiceType;
  aliases: string[];     // ["lambda", "aws lambda", "λ", "function"]
  // SVG path (24x24 viewBox) used for the icon glyph inside nodes.
  iconPath: string;
  brandColor?: string;
  description: string;
  docLink?: string;
}

// ----- Icon glyphs (24x24 viewBox, simple line/solid shapes) -----
const G = {
  cloud: "M6 18a4 4 0 0 1 .5-7.97A6 6 0 0 1 18 9a3.5 3.5 0 0 1 0 7H6z",
  server:
    "M5 4h14a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm0 8h14a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zM7 6.5h.01M7 14.5h.01",
  database:
    "M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3v12c0 1.66-3.58 3-8 3s-8-1.34-8-3V6zm0 4c0 1.66 3.58 3 8 3s8-1.34 8-3M4 14c0 1.66 3.58 3 8 3s8-1.34 8-3",
  cube:
    "M12 2 3 7v10l9 5 9-5V7l-9-5zm0 0v20M3 7l9 5 9-5",
  box: "M3 7l9-4 9 4v10l-9 4-9-4V7z",
  bolt:
    "M13 2 4 14h6l-1 8 9-12h-6l1-8z",
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c3 3 4.5 6.5 4.5 10S15 19 12 22M12 2c-3 3-4.5 6.5-4.5 10S9 19 12 22M2 12h20",
  shield:
    "M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z",
  eye:
    "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  chip:
    "M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2 4h6v6H9V9z",
  layers:
    "M12 2 2 7l10 5 10-5-10-5zm0 7L2 14l10 5 10-5-10-5zm0 7l-10 5 10 5 10-5-10-5z",
  window:
    "M3 5h18v14H3V5zm0 4h18M7 8h.01M10 8h.01",
  queue:
    "M3 6h18v4H3V6zm0 8h18v4H3v-4zM7 8h.01M7 16h.01",
  refresh:
    "M21 12a9 9 0 1 1-3-6.7L21 8m0-5v5h-5",
  robot:
    "M12 2v3M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm-1 4h.01m8 0h.01M9 14h6",
  pin: "M12 2a6 6 0 0 0-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 0 0-6-6zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  fire:
    "M12 2c2 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 1 2 2 3 3 3-1-3-2-6 0-10z",
  wave:
    "M3 12c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4 2 4 2 4M3 18c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4 2 4 2 4",
  flow:
    "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6zM10 7h4M7 10v4M14 10v4",
};

// Color by service type
export const TYPE_COLORS: Record<ServiceType, string> = {
  compute: "#3b82f6",
  container: "#06b6d4",
  database: "#f97316",
  cache: "#22c55e",
  storage: "#f59e0b",
  cdn: "#a855f7",
  messaging: "#ec4899",
  queue: "#10b981",
  networking: "#6366f1",
  analytics: "#8b5cf6",
  monitoring: "#0ea5e9",
  security: "#ef4444",
  ai: "#d946ef",
  frontend: "#14b8a6",
  external: "#64748b",
  client: "#475569",
};

// Edge color by protocol
export const PROTOCOL_COLORS: Record<string, string> = {
  http: "#3b82f6",
  https: "#2563eb",
  db: "#22c55e",
  postgres: "#22c55e",
  mysql: "#22c55e",
  redis: "#f97316",
  event: "#f59e0b",
  sqs: "#f59e0b",
  sns: "#ec4899",
  grpc: "#a855f7",
  tcp: "#6366f1",
  udp: "#6366f1",
  direct: "#ef4444",
  amqp: "#10b981",
  mqtt: "#06b6d4",
  websocket: "#0ea5e9",
};

function svc(
  id: string,
  name: string,
  provider: ServiceProvider,
  type: ServiceType,
  aliases: string[],
  iconPath: string,
  description: string,
  brandColor?: string,
  docLink?: string,
): ServiceMeta {
  return { id, name, provider, type, aliases, iconPath, description, brandColor, docLink };
}

// ---------------- AWS (60+) ----------------
const AWS: ServiceMeta[] = [
  svc("aws.ec2", "AWS EC2", "aws", "compute", ["ec2", "aws ec2", "elastic compute cloud"], G.server, "Virtual servers in the cloud", "#ff9900", "https://aws.amazon.com/ec2/"),
  svc("aws.lambda", "AWS Lambda", "aws", "compute", ["lambda", "aws lambda", "λ", "function", "functions"], G.bolt, "Serverless compute for any workload", "#ff9900", "https://aws.amazon.com/lambda/"),
  svc("aws.fargate", "AWS Fargate", "aws", "compute", ["fargate", "aws fargate"], G.cube, "Serverless compute for containers", "#ff9900", "https://aws.amazon.com/fargate/"),
  svc("aws.batch", "AWS Batch", "aws", "compute", ["batch", "aws batch"], G.layers, "Run batch jobs at any scale", "#ff9900"),
  svc("aws.beanstalk", "AWS Elastic Beanstalk", "aws", "compute", ["beanstalk", "elastic beanstalk", "eb"], G.layers, "Deploy and scale web apps", "#ff9900"),
  svc("aws.eks", "Amazon EKS", "aws", "container", ["eks", "aws eks", "kubernetes", "elastic kubernetes"], G.cube, "Managed Kubernetes service", "#ff9900", "https://aws.amazon.com/eks/"),
  svc("aws.ecs", "Amazon ECS", "aws", "container", ["ecs", "aws ecs", "elastic container"], G.cube, "Container orchestration", "#ff9900"),
  svc("aws.ecr", "Amazon ECR", "aws", "container", ["ecr", "aws ecr", "container registry"], G.box, "Container registry", "#ff9900"),
  svc("aws.rds", "AWS RDS", "aws", "database", ["rds", "aws rds", "postgres", "postgresql", "mysql", "aurora", "relational database"], G.database, "Managed relational database", "#ff9900", "https://aws.amazon.com/rds/"),
  svc("aws.aurora", "Amazon Aurora", "aws", "database", ["aurora", "aws aurora"], G.database, "MySQL/PostgreSQL-compatible DB", "#ff9900"),
  svc("aws.dynamodb", "Amazon DynamoDB", "aws", "database", ["dynamodb", "dynamo", "aws dynamodb", "nosql"], G.database, "Managed NoSQL database", "#ff9900", "https://aws.amazon.com/dynamodb/"),
  svc("aws.redshift", "Amazon Redshift", "aws", "database", ["redshift", "aws redshift"], G.database, "Data warehouse", "#ff9900"),
  svc("aws.neptune", "Amazon Neptune", "aws", "database", ["neptune", "aws neptune"], G.database, "Graph database service", "#ff9900"),
  svc("aws.documentdb", "Amazon DocumentDB", "aws", "database", ["documentdb", "aws documentdb", "mongo"], G.database, "MongoDB-compatible DB", "#ff9900"),
  svc("aws.elasticache", "Amazon ElastiCache", "aws", "cache", ["elasticache", "aws elasticache", "redis", "memcached"], G.chip, "In-memory caching service", "#ff9900", "https://aws.amazon.com/elasticache/"),
  svc("aws.s3", "Amazon S3", "aws", "storage", ["s3", "aws s3", "simple storage", "bucket"], G.box, "Object storage", "#ff9900", "https://aws.amazon.com/s3/"),
  svc("aws.ebs", "Amazon EBS", "aws", "storage", ["ebs", "aws ebs"], G.box, "Block storage for EC2", "#ff9900"),
  svc("aws.efs", "Amazon EFS", "aws", "storage", ["efs", "aws efs", "file storage"], G.layers, "Elastic file system", "#ff9900"),
  svc("aws.glacier", "S3 Glacier", "aws", "storage", ["glacier", "s3 glacier", "archive"], G.box, "Long-term archive storage", "#ff9900"),
  svc("aws.cloudfront", "Amazon CloudFront", "aws", "cdn", ["cloudfront", "aws cloudfront", "cdn", "cf"], G.globe, "Global CDN", "#ff9900", "https://aws.amazon.com/cloudfront/"),
  svc("aws.route53", "Amazon Route 53", "aws", "networking", ["route53", "route 53", "dns"], G.globe, "DNS web service", "#ff9900"),
  svc("aws.vpc", "Amazon VPC", "aws", "networking", ["vpc", "aws vpc", "network"], G.layers, "Virtual private cloud", "#ff9900"),
  svc("aws.elb", "Elastic Load Balancing", "aws", "networking", ["elb", "alb", "nlb", "load balancer", "aws elb"], G.refresh, "Load balancing", "#ff9900"),
  svc("aws.api-gateway", "Amazon API Gateway", "aws", "networking", ["api gateway", "apigw", "aws api gateway", "apigateway"], G.flow, "API management", "#ff9900", "https://aws.amazon.com/api-gateway/"),
  svc("aws.appsync", "AWS AppSync", "aws", "networking", ["appsync", "aws appsync", "graphql"], G.flow, "GraphQL API service", "#ff9900"),
  svc("aws.sns", "Amazon SNS", "aws", "messaging", ["sns", "aws sns", "notifications", "simple notification"], G.wave, "Pub/sub messaging", "#ff9900", "https://aws.amazon.com/sns/"),
  svc("aws.sqs", "Amazon SQS", "aws", "queue", ["sqs", "aws sqs", "queue", "simple queue"], G.queue, "Message queueing", "#ff9900", "https://aws.amazon.com/sqs/"),
  svc("aws.kinesis", "Amazon Kinesis", "aws", "messaging", ["kinesis", "aws kinesis", "stream"], G.wave, "Real-time streaming", "#ff9900"),
  svc("aws.mq", "Amazon MQ", "aws", "queue", ["mq", "amazon mq", "activemq", "rabbitmq"], G.queue, "Message broker", "#ff9900"),
  svc("aws.eventbridge", "Amazon EventBridge", "aws", "messaging", ["eventbridge", "aws eventbridge", "event bus"], G.wave, "Event bus service", "#ff9900"),
  svc("aws.cloudwatch", "Amazon CloudWatch", "aws", "monitoring", ["cloudwatch", "aws cloudwatch", "monitoring", "metrics"], G.eye, "Monitoring & observability", "#ff9900", "https://aws.amazon.com/cloudwatch/"),
  svc("aws.cloudtrail", "AWS CloudTrail", "aws", "monitoring", ["cloudtrail", "aws cloudtrail"], G.eye, "API call auditing", "#ff9900"),
  svc("aws.xray", "AWS X-Ray", "aws", "monitoring", ["xray", "x-ray", "aws xray"], G.eye, "Distributed tracing", "#ff9900"),
  svc("aws.iam", "AWS IAM", "aws", "security", ["iam", "aws iam", "identity"], G.shield, "Identity & access management", "#ff9900"),
  svc("aws.kms", "AWS KMS", "aws", "security", ["kms", "aws kms", "encryption"], G.shield, "Key management service", "#ff9900"),
  svc("aws.cognito", "Amazon Cognito", "aws", "security", ["cognito", "aws cognito", "auth"], G.shield, "User identity & auth", "#ff9900"),
  svc("aws.secretsmanager", "AWS Secrets Manager", "aws", "security", ["secrets manager", "secretsmanager", "aws secrets"], G.shield, "Secrets management", "#ff9900"),
  svc("aws.waf", "AWS WAF", "aws", "security", ["waf", "aws waf", "firewall"], G.shield, "Web application firewall", "#ff9900"),
  svc("aws.sagemaker", "Amazon SageMaker", "aws", "ai", ["sagemaker", "aws sagemaker", "ml"], G.robot, "ML model building & training", "#ff9900"),
  svc("aws.bedrock", "Amazon Bedrock", "aws", "ai", ["bedrock", "aws bedrock", "llm"], G.robot, "Managed foundation models", "#ff9900"),
  svc("aws.rekognition", "Amazon Rekognition", "aws", "ai", ["rekognition", "aws rekognition", "vision"], G.eye, "Image & video analysis", "#ff9900"),
  svc("aws.lex", "Amazon Lex", "aws", "ai", ["lex", "aws lex", "chatbot"], G.robot, "Conversational AI", "#ff9900"),
  svc("aws.polly", "Amazon Polly", "aws", "ai", ["polly", "aws polly", "tts"], G.wave, "Text-to-speech", "#ff9900"),
  svc("aws.transcribe", "Amazon Transcribe", "aws", "ai", ["transcribe", "aws transcribe", "asr"], G.wave, "Speech-to-text", "#ff9900"),
  svc("aws.athena", "Amazon Athena", "aws", "analytics", ["athena", "aws athena"], G.database, "Serverless interactive query", "#ff9900"),
  svc("aws.glue", "AWS Glue", "aws", "analytics", ["glue", "aws glue", "etl"], G.refresh, "ETL service", "#ff9900"),
  svc("aws.quicksight", "Amazon QuickSight", "aws", "analytics", ["quicksight", "aws quicksight", "bi"], G.eye, "Business intelligence", "#ff9900"),
  svc("aws.stepfunctions", "AWS Step Functions", "aws", "compute", ["step functions", "stepfunctions", "aws step functions", "sfn"], G.flow, "Serverless orchestration", "#ff9900"),
  svc("aws.amplify", "AWS Amplify", "aws", "frontend", ["amplify", "aws amplify"], G.window, "Frontend hosting & dev platform", "#ff9900"),
  svc("aws.cdk", "AWS CDK", "aws", "compute", ["cdk", "aws cdk", "infrastructure as code"], G.chip, "Infrastructure as code", "#ff9900"),
  svc("aws.cloudformation", "AWS CloudFormation", "aws", "compute", ["cloudformation", "cf", "aws cloudformation"], G.layers, "Infrastructure as code (template)", "#ff9900"),
  svc("aws.ses", "Amazon SES", "aws", "messaging", ["ses", "aws ses", "email"], G.wave, "Email sending service", "#ff9900"),
  svc("aws.connect", "Amazon Connect", "aws", "external", ["connect", "aws connect"], G.window, "Cloud contact center", "#ff9900"),
  svc("aws.iot", "AWS IoT Core", "aws", "messaging", ["iot", "aws iot", "mqtt"], G.pin, "IoT device connectivity", "#ff9900"),
  svc("aws.codedeploy", "AWS CodeDeploy", "aws", "compute", ["codedeploy", "aws codedeploy", "deploy"], G.refresh, "Automated deployment service", "#ff9900"),
  svc("aws.codepipeline", "AWS CodePipeline", "aws", "compute", ["codepipeline", "aws codepipeline", "ci/cd", "pipeline"], G.flow, "CI/CD orchestration", "#ff9900"),
  svc("aws.codebuild", "AWS CodeBuild", "aws", "compute", ["codebuild", "aws codebuild", "build"], G.chip, "Build service", "#ff9900"),
  svc("aws.codecommit", "AWS CodeCommit", "aws", "storage", ["codecommit", "aws codecommit", "git"], G.box, "Source control service", "#ff9900"),
  svc("aws.organizations", "AWS Organizations", "aws", "security", ["organizations", "aws organizations"], G.layers, "Multi-account management", "#ff9900"),
  svc("aws.backup", "AWS Backup", "aws", "storage", ["backup", "aws backup"], G.box, "Centralized backup", "#ff9900"),
  svc("aws.dms", "AWS DMS", "aws", "database", ["dms", "aws dms", "migration"], G.refresh, "Database migration service", "#ff9900"),
];

// ---------------- GCP (40+) ----------------
const GCP: ServiceMeta[] = [
  svc("gcp.compute", "Google Compute Engine", "gcp", "compute", ["gce", "compute engine", "gcp vm", "gcp compute"], G.server, "VMs on Google infrastructure", "#4285f4"),
  svc("gcp.cloudrun", "Google Cloud Run", "gcp", "compute", ["cloud run", "cloudrun", "gcp cloudrun"], G.bolt, "Serverless containers", "#4285f4"),
  svc("gcp.cloudfunctions", "Google Cloud Functions", "gcp", "compute", ["cloud functions", "cloudfunctions", "gcp functions"], G.bolt, "Serverless functions", "#4285f4"),
  svc("gcp.appengine", "Google App Engine", "gcp", "compute", ["app engine", "appengine", "gae"], G.layers, "Serverless app platform", "#4285f4"),
  svc("gcp.gke", "Google Kubernetes Engine", "gcp", "container", ["gke", "gcp gke", "google kubernetes"], G.cube, "Managed Kubernetes", "#4285f4", "https://cloud.google.com/kubernetes-engine"),
  svc("gcp.artifactregistry", "Google Artifact Registry", "gcp", "container", ["artifact registry", "gcr", "artifactregistry"], G.box, "Container registry", "#4285f4"),
  svc("gcp.cloudsql", "Google Cloud SQL", "gcp", "database", ["cloud sql", "cloudsql", "gcp sql"], G.database, "Managed relational DB", "#4285f4"),
  svc("gcp.spanner", "Google Cloud Spanner", "gcp", "database", ["spanner", "gcp spanner"], G.database, "Horizontal SQL database", "#4285f4"),
  svc("gcp.firestore", "Google Firestore", "gcp", "database", ["firestore", "gcp firestore", "nosql"], G.database, "Serverless NoSQL document DB", "#4285f4"),
  svc("gcp.bigtable", "Google Bigtable", "gcp", "database", ["bigtable", "gcp bigtable"], G.database, "Wide-column NoSQL DB", "#4285f4"),
  svc("gcp.memorystore", "Google Memorystore", "gcp", "cache", ["memorystore", "gcp memorystore", "gcp redis"], G.chip, "Managed Redis/Memcached", "#4285f4"),
  svc("gcp.bigquery", "Google BigQuery", "gcp", "analytics", ["bigquery", "gcp bigquery", "bq"], G.database, "Serverless data warehouse", "#4285f4"),
  svc("gcp.gcs", "Google Cloud Storage", "gcp", "storage", ["gcs", "cloud storage", "gcp storage", "bucket"], G.box, "Object storage", "#4285f4"),
  svc("gcp.filestore", "Google Filestore", "gcp", "storage", ["filestore", "gcp filestore"], G.layers, "Managed NFS file storage", "#4285f4"),
  svc("gcp.cloudcdn", "Google Cloud CDN", "gcp", "cdn", ["cloud cdn", "gcp cdn", "cloudcdn"], G.globe, "Global CDN", "#4285f4"),
  svc("gcp.loadbalancer", "Google Cloud Load Balancing", "gcp", "networking", ["cloud load balancing", "gcp load balancer", "gclb"], G.refresh, "Global load balancing", "#4285f4"),
  svc("gcp.clouddns", "Google Cloud DNS", "gcp", "networking", ["cloud dns", "gcp dns"], G.globe, "Managed DNS", "#4285f4"),
  svc("gcp.apigateway", "Google API Gateway", "gcp", "networking", ["gcp api gateway", "gcp apigw"], G.flow, "API gateway", "#4285f4"),
  svc("gcp.apigee", "Google Apigee", "gcp", "networking", ["apigee", "gcp apigee"], G.flow, "API management platform", "#4285f4"),
  svc("gcp.pubsub", "Google Pub/Sub", "gcp", "messaging", ["pub sub", "pubsub", "gcp pubsub", "pub/sub"], G.wave, "Event streaming & messaging", "#4285f4", "https://cloud.google.com/pubsub"),
  svc("gcp.cloudtasks", "Google Cloud Tasks", "gcp", "queue", ["cloud tasks", "gcp tasks", "cloudtasks"], G.queue, "Asynchronous task execution", "#4285f4"),
  svc("gcp.eventarc", "Google Eventarc", "gcp", "messaging", ["eventarc", "gcp eventarc"], G.wave, "Event routing", "#4285f4"),
  svc("gcp.cloudmonitoring", "Google Cloud Monitoring", "gcp", "monitoring", ["cloud monitoring", "gcp monitoring", "stackdriver"], G.eye, "Observability platform", "#4285f4"),
  svc("gcp.cloudlogging", "Google Cloud Logging", "gcp", "monitoring", ["cloud logging", "gcp logging"], G.eye, "Log management", "#4285f4"),
  svc("gcp.cloudtrace", "Google Cloud Trace", "gcp", "monitoring", ["cloud trace", "gcp trace"], G.eye, "Distributed tracing", "#4285f4"),
  svc("gcp.iam", "Google Cloud IAM", "gcp", "security", ["gcp iam", "cloud iam"], G.shield, "Identity & access mgmt", "#4285f4"),
  svc("gcp.kms", "Google Cloud KMS", "gcp", "security", ["gcp kms", "cloud kms"], G.shield, "Key management", "#4285f4"),
  svc("gcp.secretmanager", "Google Secret Manager", "gcp", "security", ["secret manager", "gcp secrets"], G.shield, "Secrets management", "#4285f4"),
  svc("gcp.vertexai", "Google Vertex AI", "gcp", "ai", ["vertex ai", "vertex", "gcp ml"], G.robot, "End-to-end ML platform", "#4285f4"),
  svc("gcp.dialogflow", "Google Dialogflow", "gcp", "ai", ["dialogflow", "gcp dialogflow"], G.robot, "Conversational AI", "#4285f4"),
  svc("gcp.dataproc", "Google Dataproc", "gcp", "analytics", ["dataproc", "gcp dataproc", "spark"], G.layers, "Managed Spark/Hadoop", "#4285f4"),
  svc("gcp.dataflow", "Google Dataflow", "gcp", "analytics", ["dataflow", "gcp dataflow"], G.refresh, "Stream/batch data processing", "#4285f4"),
  svc("gcp.looker", "Google Looker", "gcp", "analytics", ["looker", "gcp looker", "bi"], G.eye, "BI & analytics", "#4285f4"),
  svc("gcp.firebase", "Google Firebase", "gcp", "frontend", ["firebase", "gcp firebase"], G.fire, "App development platform", "#4285f4"),
  svc("gcp.cloudbuild", "Google Cloud Build", "gcp", "compute", ["cloud build", "gcp build", "cloudbuild"], G.chip, "CI/CD pipeline", "#4285f4"),
  svc("gcp.clouddeploy", "Google Cloud Deploy", "gcp", "compute", ["cloud deploy", "clouddeploy"], G.refresh, "Continuous delivery", "#4285f4"),
  svc("gcp.workflows", "Google Workflows", "gcp", "compute", ["gcp workflows", "workflows"], G.flow, "Serverless orchestration", "#4285f4"),
  svc("gcp.vpc", "Google VPC", "gcp", "networking", ["gcp vpc", "vpc"], G.layers, "Virtual private cloud", "#4285f4"),
  svc("gcp.gemini", "Google Gemini", "gcp", "ai", ["gemini", "gcp gemini", "llm"], G.robot, "Multimodal foundation model", "#4285f4"),
  svc("gcp.contactcenterai", "Google Contact Center AI", "gcp", "ai", ["cca", "contact center ai", "ccai"], G.robot, "AI contact center", "#4285f4"),
];

// ---------------- Azure (40+) ----------------
const AZURE: ServiceMeta[] = [
  svc("azure.vm", "Azure Virtual Machines", "azure", "compute", ["azure vm", "azure virtual machine", "azure compute"], G.server, "VMs on Azure", "#0078d4"),
  svc("azure.functions", "Azure Functions", "azure", "compute", ["azure functions", "functions", "azure function"], G.bolt, "Serverless compute", "#0078d4"),
  svc("azure.containerapps", "Azure Container Apps", "azure", "compute", ["container apps", "containerapps"], G.cube, "Serverless containers", "#0078d4"),
  svc("azure.appservice", "Azure App Service", "azure", "compute", ["app service", "appservice", "azure app service"], G.layers, "Managed web apps", "#0078d4"),
  svc("azure.aks", "Azure Kubernetes Service", "azure", "container", ["aks", "azure aks", "azure kubernetes"], G.cube, "Managed Kubernetes", "#0078d4", "https://azure.microsoft.com/products/kubernetes-service"),
  svc("azure.acr", "Azure Container Registry", "azure", "container", ["acr", "azure container registry", "azure registry"], G.box, "Container registry", "#0078d4"),
  svc("azure.sql", "Azure SQL Database", "azure", "database", ["azure sql", "azure database", "sql azure"], G.database, "Managed SQL database", "#0078d4"),
  svc("azure.cosmos", "Azure Cosmos DB", "azure", "database", ["cosmos", "cosmos db", "azure cosmos", "nosql"], G.database, "Multi-model NoSQL DB", "#0078d4"),
  svc("azure.postgres", "Azure Database for PostgreSQL", "azure", "database", ["azure postgres", "azure postgresql"], G.database, "Managed PostgreSQL", "#0078d4"),
  svc("azure.mysql", "Azure Database for MySQL", "azure", "database", ["azure mysql"], G.database, "Managed MySQL", "#0078d4"),
  svc("azure.synapse", "Azure Synapse Analytics", "azure", "database", ["synapse", "azure synapse"], G.database, "Enterprise data warehouse", "#0078d4"),
  svc("azure.rediscache", "Azure Cache for Redis", "azure", "cache", ["azure redis", "azure cache", "redis cache"], G.chip, "In-memory cache", "#0078d4"),
  svc("azure.blob", "Azure Blob Storage", "azure", "storage", ["blob", "azure blob", "azure storage"], G.box, "Object storage", "#0078d4"),
  svc("azure.files", "Azure Files", "azure", "storage", ["azure files", "azure file storage"], G.layers, "Managed file shares", "#0078d4"),
  svc("azure.datalake", "Azure Data Lake Storage", "azure", "storage", ["data lake", "adls", "datalake"], G.box, "Analytics data lake", "#0078d4"),
  svc("azure.frontdoor", "Azure Front Door", "azure", "cdn", ["front door", "azure front door", "azure cdn"], G.globe, "Global CDN & WAF", "#0078d4"),
  svc("azure.trafficmanager", "Azure Traffic Manager", "azure", "networking", ["traffic manager", "azure traffic"], G.refresh, "DNS-based load balancing", "#0078d4"),
  svc("azure.loadbalancer", "Azure Load Balancer", "azure", "networking", ["azure load balancer", "azure lb"], G.refresh, "Layer-4 load balancing", "#0078d4"),
  svc("azure.appgateway", "Azure Application Gateway", "azure", "networking", ["app gateway", "application gateway", "azure app gateway"], G.flow, "Layer-7 load balancing", "#0078d4"),
  svc("azure.apim", "Azure API Management", "azure", "networking", ["apim", "api management", "azure apim"], G.flow, "API gateway & management", "#0078d4"),
  svc("azure.dns", "Azure DNS", "azure", "networking", ["azure dns"], G.globe, "DNS hosting", "#0078d4"),
  svc("azure.servicebus", "Azure Service Bus", "azure", "queue", ["service bus", "servicebus", "azure service bus"], G.queue, "Enterprise message broker", "#0078d4"),
  svc("azure.eventgrid", "Azure Event Grid", "azure", "messaging", ["event grid", "eventgrid", "azure event grid"], G.wave, "Event routing service", "#0078d4"),
  svc("azure.eventhubs", "Azure Event Hubs", "azure", "messaging", ["event hubs", "eventhubs", "azure event hub"], G.wave, "Big data streaming", "#0078d4"),
  svc("azure.storagequeue", "Azure Queue Storage", "azure", "queue", ["azure queue", "storage queue", "queue storage"], G.queue, "Simple message queue", "#0078d4"),
  svc("azure.monitor", "Azure Monitor", "azure", "monitoring", ["azure monitor", "azure monitoring"], G.eye, "Full-stack observability", "#0078d4"),
  svc("azure.appinsights", "Azure Application Insights", "azure", "monitoring", ["app insights", "application insights"], G.eye, "APM service", "#0078d4"),
  svc("azure.loganalytics", "Azure Log Analytics", "azure", "monitoring", ["log analytics", "azure logs"], G.eye, "Log analytics workspace", "#0078d4"),
  svc("azure.keyvault", "Azure Key Vault", "azure", "security", ["key vault", "keyvault", "azure key vault"], G.shield, "Key & secrets management", "#0078d4"),
  svc("azure.aad", "Azure Active Directory", "azure", "security", ["azure ad", "aad", "active directory", "entra id"], G.shield, "Identity & access", "#0078d4"),
  svc("azure.defender", "Microsoft Defender for Cloud", "azure", "security", ["azure defender", "defender for cloud"], G.shield, "Cloud security posture", "#0078d4"),
  svc("azure.openai", "Azure OpenAI Service", "azure", "ai", ["azure openai", "openai", "azure llm"], G.robot, "OpenAI models on Azure", "#0078d4"),
  svc("azure.ml", "Azure Machine Learning", "azure", "ai", ["azure ml", "azure machine learning", "aml"], G.robot, "ML platform", "#0078d4"),
  svc("azure.cognitiveservices", "Azure Cognitive Services", "azure", "ai", ["cognitive services", "cognitive"], G.eye, "AI APIs (vision, speech, language)", "#0078d4"),
  svc("azure.bot", "Azure AI Bot Service", "azure", "ai", ["azure bot", "bot service"], G.robot, "Conversational bots", "#0078d4"),
  svc("azure.factory", "Azure Data Factory", "azure", "analytics", ["data factory", "adf", "azure data factory"], G.flow, "Data integration (ETL)", "#0078d4"),
  svc("azure.databricks", "Azure Databricks", "azure", "analytics", ["databricks", "azure databricks"], G.layers, "Spark analytics platform", "#0078d4"),
  svc("azure.powerbi", "Microsoft Power BI", "azure", "analytics", ["power bi", "powerbi"], G.eye, "Business intelligence", "#0078d4"),
  svc("azure.devops", "Azure DevOps", "azure", "compute", ["azure devops", "devops", "azure pipelines"], G.flow, "CI/CD & dev services", "#0078d4"),
  svc("azure.staticwebapps", "Azure Static Web Apps", "azure", "frontend", ["static web apps", "azure static"], G.window, "Static site hosting", "#0078d4"),
  svc("azure.aci", "Azure Container Instances", "azure", "container", ["aci", "azure container instances"], G.cube, "Serverless containers (no orchestration)", "#0078d4"),
];

// ---------------- Kubernetes (20+) ----------------
const K8S: ServiceMeta[] = [
  svc("k8s.deployment", "Deployment", "kubernetes", "compute", ["k8s deployment", "deployment"], G.layers, "Stateless workload", "#326ce5", "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"),
  svc("k8s.pod", "Pod", "kubernetes", "compute", ["pod", "k8s pod"], G.cube, "Smallest deployable unit", "#326ce5"),
  svc("k8s.statefulset", "StatefulSet", "kubernetes", "compute", ["statefulset", "stateful set"], G.layers, "Stateful workload", "#326ce5"),
  svc("k8s.daemonset", "DaemonSet", "kubernetes", "compute", ["daemonset", "daemon set"], G.layers, "Per-node workload", "#326ce5"),
  svc("k8s.job", "Job", "kubernetes", "compute", ["k8s job", "batch job"], G.chip, "Batch workload", "#326ce5"),
  svc("k8s.cronjob", "CronJob", "kubernetes", "compute", ["cronjob", "cron job"], G.refresh, "Scheduled batch", "#326ce5"),
  svc("k8s.service", "Service", "kubernetes", "networking", ["svc", "k8s service"], G.flow, "Network abstraction over pods", "#326ce5"),
  svc("k8s.ingress", "Ingress", "kubernetes", "networking", ["ingress", "k8s ingress"], G.globe, "HTTP/HTTPS routing", "#326ce5"),
  svc("k8s.networkpolicy", "NetworkPolicy", "kubernetes", "networking", ["network policy", "networkpolicy"], G.shield, "Traffic rules between pods", "#326ce5"),
  svc("k8s.configmap", "ConfigMap", "kubernetes", "storage", ["configmap", "config map"], G.box, "Non-secret config storage", "#326ce5"),
  svc("k8s.secret", "Secret", "kubernetes", "security", ["k8s secret", "secret"], G.shield, "Sensitive data storage", "#326ce5"),
  svc("k8s.pvc", "PersistentVolumeClaim", "kubernetes", "storage", ["pvc", "pv", "volume", "persistent volume"], G.box, "Persistent storage claim", "#326ce5"),
  svc("k8s.hpa", "HorizontalPodAutoscaler", "kubernetes", "compute", ["hpa", "horizontal pod autoscaler", "autoscaler"], G.refresh, "Auto-scale deployments", "#326ce5"),
  svc("k8s.helm", "Helm Chart", "kubernetes", "compute", ["helm", "chart"], G.layers, "Package manager for K8s", "#326ce5"),
  svc("k8s.operator", "Operator", "kubernetes", "compute", ["operator", "controller"], G.chip, "Custom controller", "#326ce5"),
  svc("k8s.crd", "CustomResourceDefinition", "kubernetes", "compute", ["crd", "custom resource"], G.chip, "Custom resource type", "#326ce5"),
  svc("k8s.namespace", "Namespace", "kubernetes", "networking", ["namespace", "ns"], G.layers, "Logical cluster partition", "#326ce5"),
  svc("k8s.node", "Node", "kubernetes", "compute", ["node", "worker node"], G.server, "Worker machine in cluster", "#326ce5"),
  svc("k8s.cluster", "Cluster", "kubernetes", "container", ["k8s cluster", "kubernetes cluster"], G.cube, "Full Kubernetes cluster", "#326ce5"),
  svc("k8s.endpoint", "Endpoints", "kubernetes", "networking", ["endpoint", "endpoints"], G.pin, "Network endpoint targets", "#326ce5"),
  svc("k8s.gateway", "Gateway API", "kubernetes", "networking", ["gateway api", "k8s gateway"], G.globe, "Advanced ingress/Gateway", "#326ce5"),
];

// ---------------- Generic (15+) ----------------
const GENERIC: ServiceMeta[] = [
  svc("generic.frontend", "Web Frontend", "generic", "frontend", ["frontend", "web frontend", "ui", "spa", "web app", "client app", "react", "vue", "angular", "svelte", "next.js", "nextjs"], G.window, "Browser-based UI (React/Vue/etc.)", "#14b8a6"),
  svc("generic.mobile", "Mobile App", "generic", "client", ["mobile", "mobile app", "ios", "android", "react native", "flutter"], G.window, "Mobile application", "#14b8a6"),
  svc("generic.desktop", "Desktop App", "generic", "client", ["desktop", "desktop app", "electron", "tauri"], G.window, "Desktop application", "#14b8a6"),
  svc("generic.api", "API Server", "generic", "compute", ["api", "api server", "rest api", "backend api", "node.js", "nodejs", "express", "fastapi", "django", "flask", "rails", "spring", "go api", "golang"], G.flow, "Backend API server", "#14b8a6"),
  svc("generic.microservice", "Microservice", "generic", "compute", ["microservice", "service", "microservices"], G.chip, "Independent service", "#14b8a6"),
  svc("generic.gateway", "API Gateway", "generic", "networking", ["gateway", "api gateway"], G.flow, "API entry point", "#14b8a6"),
  svc("generic.loadbalancer", "Load Balancer", "generic", "networking", ["load balancer", "lb"], G.refresh, "Traffic distribution", "#14b8a6"),
  svc("generic.postgres", "PostgreSQL", "generic", "database", ["postgres", "postgresql", "psql"], G.database, "Open-source RDBMS", "#336791"),
  svc("generic.mysql", "MySQL", "generic", "database", ["mysql", "mariadb"], G.database, "Open-source RDBMS", "#4479a1"),
  svc("generic.redis", "Redis", "generic", "cache", ["redis", "valkey"], G.chip, "In-memory data store", "#dc382d"),
  svc("generic.mongodb", "MongoDB", "generic", "database", ["mongo", "mongodb"], G.database, "Document database", "#47a248"),
  svc("generic.kafka", "Apache Kafka", "generic", "messaging", ["kafka", "event stream"], G.wave, "Distributed event streaming", "#231f20"),
  svc("generic.rabbitmq", "RabbitMQ", "generic", "queue", ["rabbitmq", "amqp"], G.queue, "Message broker", "#ff6600"),
  svc("generic.nginx", "Nginx", "generic", "networking", ["nginx", "reverse proxy", "proxy"], G.globe, "Reverse proxy / web server", "#009639"),
  svc("generic.elasticsearch", "Elasticsearch", "generic", "database", ["elasticsearch", "elastic", "es"], G.database, "Search & analytics engine", "#00bce4"),
  svc("generic.grafana", "Grafana", "generic", "monitoring", ["grafana", "dashboards"], G.eye, "Visualization & dashboards", "#f46800"),
  svc("generic.prometheus", "Prometheus", "generic", "monitoring", ["prometheus", "metrics"], G.eye, "Metrics collection", "#e6522c"),
  svc("generic.jaeger", "Jaeger", "generic", "monitoring", ["jaeger", "tracing"], G.eye, "Distributed tracing", "#66d6c9"),
  svc("generic.vercel", "Vercel", "generic", "frontend", ["vercel", "vercel hosting"], G.window, "Frontend hosting platform", "#000000"),
  svc("generic.cloudflare", "Cloudflare", "generic", "cdn", ["cloudflare", "cf"], G.globe, "Edge network & CDN", "#f48120"),
  svc("generic.github", "GitHub", "generic", "external", ["github", "git", "github actions"], G.box, "Source control / CI", "#181717"),
  svc("generic.stripe", "Stripe", "generic", "external", ["stripe", "payments"], G.bolt, "Payment processing", "#635bff"),
  svc("generic.sendgrid", "SendGrid", "generic", "messaging", ["sendgrid", "email"], G.wave, "Email delivery", "#1a1a1a"),
  svc("generic.datadog", "Datadog", "generic", "monitoring", ["datadog", "dd"], G.eye, "Cloud monitoring", "#632ca6"),
  svc("generic.sentry", "Sentry", "generic", "monitoring", ["sentry", "error tracking"], G.eye, "Error tracking", "#362d59"),
];

export const SERVICES: ServiceMeta[] = [
  ...AWS,
  ...GCP,
  ...AZURE,
  ...K8S,
  ...GENERIC,
];

// ---- Resolution utilities ----

const ALIAS_INDEX: Map<string, ServiceMeta> = (() => {
  const map = new Map<string, ServiceMeta>();
  for (const s of SERVICES) {
    const all = [s.name, s.id, ...s.aliases];
    for (const a of all) {
      const k = a.toLowerCase().trim();
      if (!k) continue;
      const existing = map.get(k);
      if (!existing || a.length > existing.name.length) map.set(k, s);
    }
  }
  return map;
})();

export function resolveServiceByName(name: string): ServiceMeta | undefined {
  if (!name) return undefined;
  const k = name.toLowerCase().trim();
  if (ALIAS_INDEX.has(k)) return ALIAS_INDEX.get(k)!;
  for (const [alias, meta] of ALIAS_INDEX) {
    if (alias.length >= 4 && k.includes(alias)) return meta;
  }
  return undefined;
}

export function listServices(filter?: {
  provider?: ServiceProvider;
  type?: ServiceType;
}): ServiceMeta[] {
  if (!filter) return SERVICES;
  return SERVICES.filter(
    (s) =>
      (!filter.provider || s.provider === filter.provider) &&
      (!filter.type || s.type === filter.type),
  );
}

export function servicesForAutocomplete(prefix: string, limit = 12): ServiceMeta[] {
  const p = prefix.toLowerCase().trim();
  if (!p) return SERVICES.slice(0, limit);
  const starts: ServiceMeta[] = [];
  const contains: ServiceMeta[] = [];
  for (const s of SERVICES) {
    const hay = (s.name + " " + s.aliases.join(" ")).toLowerCase();
    if (hay.startsWith(p)) starts.push(s);
    else if (hay.includes(p)) contains.push(s);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function getProviderLabel(p: ServiceProvider): string {
  return {
    aws: "AWS",
    gcp: "Google Cloud",
    azure: "Microsoft Azure",
    kubernetes: "Kubernetes",
    generic: "Generic / Open Source",
  }[p];
}

export function getTypeLabel(t: ServiceType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
