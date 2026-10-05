# KubeGuard

A lightweight DevSecOps telemetry agent built with Node.js and Docker. KubeGuard is designed to extract system metrics in real-time while serving as a foundational project for auditing software quality, Continuous Integration/Continuous Deployment (CI/CD) pipelines, and AI-driven code reviews.

## Features

* **Real-Time Telemetry:** Extracts hardware metrics (CPU, RAM, Uptime) via a REST API.
* **Shift-Left Security:** Built with best security practices, running as a non-root user inside Alpine Linux.
* **Automated QA Gates:** Integrated with Jest for code coverage and ESLint for cyclomatic complexity analysis.
* **CI/CD Pipeline:** Fully automated GitHub Actions workflow for static analysis, testing, and Docker builds.
* **Kubernetes Ready:** Includes standard manifests for immediate deployment to KIND or Minikube clusters.

## Tech Stack

* **Backend:** Node.js, Express.js
* **Testing & QA:** Jest, Supertest, ESLint, Cloc
* **Containerization:** Docker (Node 20 Alpine)
* **Orchestration:** Kubernetes (K8s)
* **CI/CD:** GitHub Actions
