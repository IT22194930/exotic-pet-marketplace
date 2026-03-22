# Exotic Pet Marketplace - Cloud Computing Assignment

> A secure, microservice-based e-commerce platform for exotic pet trading built with modern DevOps practices and cloud-native technologies.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Microservices](#microservices)
- [Technology Stack](#technology-stack)
- [Inter-Service Communication](#inter-service-communication)
- [DevOps Practices](#devops-practices)
- [Security Measures](#security-measures)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Challenges &amp; Solutions](#challenges--solutions)

---

## 🎯 Project Overview

The Exotic Pet Marketplace is a comprehensive e-commerce platform designed to facilitate legal and ethical trading of exotic pets. The application follows a microservices architecture with six independently deployable services and a React-based frontend, all containerized and orchestrated using Docker.

### Key Features

- 🔐 **Secure Authentication & Authorization** - JWT-based authentication with role-based access control
- 🐾 **Pet Listing Management** - Sellers can create, update, and manage exotic pet listings
- 🛒 **Order Processing** - Complete order lifecycle management from creation to completion
- 💳 **Payment Integration** - Support for online payments and cash-on-delivery
- ✅ **Compliance & Verification** - Automated restricted species checking and seller verification
- 📧 **Email Notifications** - Automated notifications for critical events

---

## 🏗️ Architecture

### Communication Patterns

1. **Synchronous Communication (REST API)**

   - Frontend ↔ API Gateway
   - API Gateway ↔ All Services
   - Inter-service direct calls for data retrieval
2. **Asynchronous Communication (Event-Driven)**

   - Services publish events to Kafka topics
   - Compliance Service consumes events for audit trails
   - Decoupled, scalable event processing

---

## 🔧 Microservices

### 1. Identity Service (Port: 8001)

**Purpose**: User authentication, authorization, and profile management

**Responsibilities**:

- User registration and login
- JWT token generation and validation
- Role-based access control (Buyer, Seller, Admin)
- User profile management
- Password hashing with bcrypt

**API Endpoints**:

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update user profile
- `DELETE /users/:id` - Delete user (admin only)

**Integrations**:

- ➡️ Compliance Service (user verification)
- ➡️ Kafka (user-events topic)

**Technology**: Node.js, Express.js, JWT, bcryptjs

---

### 2. Listing Service (Port: 8002)

**Purpose**: Pet listing creation and management

**Responsibilities**:

- Create, read, update, delete pet listings
- Image upload and management via Supabase Storage
- Listing search and filtering
- Seller-specific listing management
- Stock quantity management

**API Endpoints**:

- `POST /listings` - Create new listing
- `GET /listings` - Get all listings (with filters)
- `GET /listings/my` - Get seller's listings
- `GET /listings/:id` - Get listing details
- `PATCH /listings/:id` - Update listing
- `DELETE /listings/:id` - Delete listing

**Integrations**:

- ⬅️ Identity Service (user validation)
- ⬅️ Compliance Service (restricted species check)
- ➡️ Kafka (listing-events topic)

**Technology**: Node.js, Express.js, Supabase Storage

---

### 3. Order Service (Port: 8003)

**Purpose**: Order lifecycle management

**Responsibilities**:

- Order creation and validation
- Order status management (created, completed)
- Buyer order history
- Seller order tracking
- Listing stock synchronization

**API Endpoints**:

- `POST /orders` - Create new order
- `GET /orders` - Get all orders (role-based)
- `GET /orders/my` - Get buyer's orders
- `GET /orders/:id` - Get order details
- `PATCH /orders/:id/complete` - Mark order as complete

**Integrations**:

- ⬅️ Identity Service (user validation)
- ⬅️ Listing Service (listing details, stock update)
- ⬅️ Compliance Service (order validation)
- ➡️ Kafka (order-events topic)

**Technology**: Node.js, Express.js

---

### 4. Payment Service (Port: 8005)

**Purpose**: Payment processing and transaction management

**Responsibilities**:

- Payment method handling (online, cash-on-delivery)
- Card validation (server-side validation)
- Payment status tracking
- Payment history management
- Order completion integration

**API Endpoints**:

- `POST /payments/process` - Process payment
- `POST /payments/status/bulk` - Get payment status for multiple orders

**Integrations**:

- ⬅️ Order Service (order details, mark complete)
- ⬅️ Identity Service (user validation)
- ⬅️ Compliance Service (payment success notifications)

**Technology**: Node.js, Express.js

---

### 5. Compliance Service (Port: 8004)

**Purpose**: Regulatory compliance and notifications

**Responsibilities**:

- Restricted species management
- Seller verification workflow
- Compliance audit trail via event consumption
- Email notifications (seller verification, payment success, order updates)
- Event-driven compliance monitoring

**API Endpoints**:

- `GET /restricted-species` - Get restricted species list
- `POST /restricted-species` - Add restricted species (admin)
- `DELETE /restricted-species/:id` - Remove restricted species (admin)
- `GET /seller-verification` - Get verification status
- `POST /seller-verification/request` - Request verification
- `PATCH /seller-verification/:id/approve` - Approve verification (admin)
- `POST /notify/payment-success` - Send payment notification

**Integrations**:

- ⬅️ Kafka Consumer (order-events, user-events, listing-events)
- ⬅️ SMTP (email notifications via Nodemailer)

**Technology**: Node.js, Express.js, KafkaJS, Nodemailer

---

### 6. API Gateway (Port: 8000)

**Purpose**: Single entry point for all client requests

**Responsibilities**:

- Request routing to appropriate microservices
- Centralized CORS management
- Request/response logging
- Service health monitoring

**Routes**:

- `/auth/*` → Identity Service
- `/users/*` → Identity Service
- `/listings/*` → Listing Service
- `/orders/*` → Order Service
- `/payments/*` → Payment Service
- `/compliance/*` → Compliance Service

**Technology**: Node.js, Express.js, Axios

---

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js 20.x
- **Framework**: Express.js 5.x
- **Authentication**: JSON Web Tokens (JWT)
- **Password Hashing**: bcryptjs
- **Message Broker**: Apache Kafka (KRaft mode)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Email**: Nodemailer
- **API Documentation**: Swagger/OpenAPI

### DevOps & Infrastructure

- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Version Control**: Git
- **Container Registry**: Docker Hub
- **Cloud Provider**: AWS/Azure/GCP

---

## 🔄 Inter-Service Communication

### Synchronous Communication Examples

#### 1. Order Service → Listing Service

```javascript
// GET listing details when creating an order
const listingResponse = await axios.get(
  `${LISTING_URL}/listings/${listingId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

#### 2. Payment Service → Order Service

```javascript
// Mark order as complete after successful payment
const orderUpdate = await axios.patch(
  `${ORDER_URL}/orders/${orderId}/complete`,
  {},
  { headers: { Authorization: authHeader } }
);
```

#### 3. Listing Service → Compliance Service

```javascript
// Check if species is restricted
const complianceCheck = await axios.get(
  `${COMPLIANCE_URL}/restricted-species`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Asynchronous Communication (Event-Driven)

#### Event Publishing (Identity Service)

```javascript
// Publish user registration event to Kafka
await producer.send({
  topic: "user-events",
  messages: [
    {
      key: userId,
      value: JSON.stringify({
        event: "user.registered",
        userId: userId,
        email: email,
        role: role,
        timestamp: new Date().toISOString(),
      }),
    },
  ],
});
```

#### Event Consumption (Compliance Service)

```javascript
// Consume events for audit trail
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    await saveComplianceAudit(event);
  },
});
```

---

## ⚙️ DevOps Practices

### 1. Version Control

- **Git Repository**: [Your Repository URL]
- **Branching Strategy**:
  - `main` - Production-ready code
  - `dev` - Development branch
  - Feature branches for new features
- **Commit Convention**: Conventional Commits

### 2. Containerization

Each microservice includes a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8001
CMD ["npm", "start"]
```

### 3. Container Orchestration

**Docker Compose** manages all services:

- Automatic service dependency management
- Network isolation with custom bridge network
- Volume mounting for development
- Health checks for Kafka
- Environment variable management

### 4. CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
name: CI/CD Pipeline

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run SAST scan
        run: npm run sonar-scan

      - name: Build Docker image
        run: docker build -t service-name .

      - name: Push to registry
        run: docker push your-registry/service-name

      - name: Deploy to cloud
        run: ./deploy.sh
```

## Security Measures

### 1. Authentication & Authorization

- **JWT Tokens**: 24-hour expiration
- **Role-Based Access Control**: Buyer, Seller, Admin roles
- **Password Security**: bcrypt hashing with salt rounds
- **Token Validation**: Middleware for protected routes

### 2. Input Validation

- Server-side validation for all inputs
- SQL injection prevention via Supabase client
- XSS prevention through input sanitization
- Email validation and format checking

### 3. API Security

- **CORS Configuration**: Controlled cross-origin requests
- **Rate Limiting**: Prevent DDoS attacks (recommended)
- **HTTPS**: TLS/SSL encryption in production
- **Environment Variables**: Sensitive data in .env files

### 4. Database Security

- **Supabase Service Role Key**: Server-side only, never exposed to client
- **Row-Level Security**: PostgreSQL RLS policies
- **Least Privilege Principle**: Services only access required data

### 5. DevSecOps Practices

#### SAST Integration

- **SonarCloud**: Code quality and security scanning
- **Snyk**: Dependency vulnerability scanning
- **npm audit**: Regular dependency audits

```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix
```

### 6. Infrastructure Security

- **IAM Roles**: Least privilege access for cloud resources
- **Security Groups**: Firewall rules for inbound/outbound traffic
- **Secrets Management**: AWS Secrets Manager / Azure Key Vault
- **Container Scanning**: Image vulnerability scanning before deployment

### 7. Data Protection

- **HTTPS Only**: All production traffic encrypted
- **Data Encryption**: At-rest encryption in Supabase
- **Audit Logs**: Compliance service tracks all critical operations

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Docker & Docker Compose
- Git
- Supabase Account

### Environment Setup

1. **Clone the repository**

```bash
git clone https://github.com/IT22194930/exotic-pet-marketplace.git
cd exotic-pet-marketplace
```

2. **Backend Environment Variables**

Create `.env` file in `backend` directory:

```env
# Supabase
SUPABASE_URL=https://plruuzubfulccriopggs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscnV1enViZnVsY2NyaW9wZ2dzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg0MTA5MSwiZXhwIjoyMDg3NDE3MDkxfQ.hr6sewqiwCtdXTiul3SxkKrwJ33i0BCs4Am7Wrp3siI

# JWT
JWT_SECRET=CN4vbU9nRdi1ubOq5a1IYcw5WBvi7FfTz8iqC8ojWGA

# SMTP (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nadilsenrukabk@gmail.com
SMTP_PASS=vshk rika bxxt enoc
SMTP_FROM=Exotic Pet Marketplace <nadilsenrukabk@gmail.com>
```

3. **Frontend Environment Variables**

Create `.env` file in `frontend` directory:

```env
VITE_API_GATEWAY_URL=http://localhost:8000
```

### Running with Docker Compose

```bash
# Navigate to backend directory
cd backend

# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down
```

### Running Locally (Development)

**Backend Services**:

```bash
# Install dependencies for each service
cd backend/services/identity-service
npm install
npm run dev

# Repeat for other services
```

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

### Access Points

| Service            | URL                   | Purpose          |
| ------------------ | --------------------- | ---------------- |
| Frontend           | http://localhost:5173 | User interface   |
| API Gateway        | http://localhost:8000 | API entry point  |
| Identity Service   | http://localhost:8001 | Auth & users     |
| Listing Service    | http://localhost:8002 | Pet listings     |
| Order Service      | http://localhost:8003 | Orders           |
| Compliance Service | http://localhost:8004 | Compliance       |
| Payment Service    | http://localhost:8005 | Payments         |
| Kafka UI           | http://localhost:8088 | Kafka monitoring |

---

## 📚 API Documentation

Each service exposes Swagger documentation:

- **Identity Service**: http://localhost:8001/api-docs
- **Listing Service**: http://localhost:8002/api-docs
- **Order Service**: http://localhost:8003/api-docs
- **Compliance Service**: http://localhost:8004/api-docs
- **Payment Service**: http://localhost:8005/api-docs

---

## ☁️ Deployment

### Continuous Deployment

GitHub Actions workflow automatically:

1. Runs tests and security scans
2. Builds Docker images
3. Pushes to container registry
4. Deploys to cloud platform
5. Runs health checks

---

## 🎯 Challenges & Solutions

### Challenge 1: Inter-Service Communication

**Problem**: Services needed to communicate while maintaining independence.

**Solution**:

- Implemented API Gateway for centralized routing
- Used both synchronous (REST) and asynchronous (Kafka) communication
- Service discovery through environment variables

### Challenge 2: Data Consistency

**Problem**: Ensuring data consistency across distributed services.

**Solution**:

- Event sourcing with Kafka for audit trails
- Atomic operations within service boundaries
- Eventual consistency for non-critical data

### Challenge 3: Authentication Across Services

**Problem**: JWT validation in each microservice.

**Solution**:

- Created reusable JWT middleware
- Token validation at API Gateway level
- Service-to-service authentication via shared secret

### Challenge 4: Docker Networking

**Problem**: Services couldn't communicate in Docker environment.

**Solution**:

- Created custom bridge network in docker-compose
- Used service names as hostnames
- Proper port exposure configuration

### Challenge 5: Event-Driven Architecture

**Problem**: Setting up Kafka in development environment.

**Solution**:

- Used Kafka in KRaft mode (no Zookeeper dependency)
- Implemented health checks for Kafka readiness
- Created init container to pre-create topics

### Challenge 6: Environment Management

**Problem**: Managing different configurations for dev/staging/prod.

**Solution**:

- Environment-specific .env files
- Docker Compose overrides for different environments
- Secrets management via cloud provider

### Challenge 7: Database Migrations

**Problem**: Schema updates across multiple services.

**Solution**:

- Each service owns its data schema
- Supabase migration scripts
- Backward-compatible API changes

---

## 📊 Monitoring

- **Kafka UI**: Monitor message queues at http://localhost:8088
- **Service Health Checks**: Each service exposes `/health` endpoint
- **Logging**: Structured logging with timestamps
