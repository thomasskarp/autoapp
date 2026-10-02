# 🧠 AutoApp - Base de Conocimiento AWS & Inteligencia Artificial

Este documento recopila de forma estructurada el conocimiento técnico, patrones de arquitectura, servicios y mejores prácticas extraídas de las fuentes y capacitaciones asignadas para el rol de **Agente AWS y Mentor Técnico de AutoApp**.

---

## 📹 Fuente #1: AWS Certified AI Practitioner (AIF-C01)
- **Autor / Instructor:** Andrew Brown (ExamPro / freeCodeCamp)
- **Duración:** ~15 Horas
- **Objetivo:** Certificación AWS AI Practitioner (AIF-C01) y dominio de la suite de IA / GenAI en AWS.

---

### 1. Dominios Oficiales de la Certificación (AIF-C01)

| Dominio | Peso | Enfoque Principal |
|---|---|---|
| **Dominio 1: Fundamentos de AI y ML** | 20% | Conceptos base, tipos de aprendizaje (supervisado, no supervisado, por refuerzo), ciclo de vida de modelos, métricas de evaluación (Accuracy, Precision, Recall, F1-Score, RMSE, BLEU, ROUGE). |
| **Dominio 2: Fundamentos de IA Generativa** | 24% | Foundation Models (FM), LLMs, tokens, context window, embeddings, inferencia, latencia y costos. |
| **Dominio 3: Aplicación de Foundation Models** | 28% | In-context learning, Prompt Engineering (Zero-shot, Few-shot, Chain-of-Thought), RAG, Fine-tuning, agentes autónomos y orquestación con Amazon Bedrock. |
| **Dominio 4: Directrices para IA Responsable** | 14% | Equidad, mitigación de sesgos, explicabilidad de modelos, privacidad de datos, seguridad y Bedrock Guardrails. |
| **Dominio 5: Seguridad, Cumplimiento y Gobernanza** | 14% | IAM, VPC endpoints (PrivateLink), cifrado KMS (reposo y tránsito), auditoría con CloudTrail/CloudWatch, cumplimiento normativo. |

---

### 2. Desglose Técnico de Servicios y Conceptos Clave

#### A. Amazon Bedrock (Pilar Serverless de GenAI)
- **Naturaleza:** Servicio totalmente administrado y serverless para acceder a Foundation Models (FMs) líderes de la industria mediante una API unificada y segura.
- **Modelos Disponibles:** Amazon Titan, Anthropic Claude, Meta Llama, AI21 Labs Jurassic, Cohere Command/Embed, Mistral AI.
- **Mecanismos de Adaptación:**
  - *Prompt Engineering:* Zero-shot, Few-shot, Chain-of-Thought (CoT), delimitadores, control de temperatura, top_p, top_k.
  - *RAG (Retrieval-Augmented Generation):* Conexión dinámica a bases de conocimiento vectoriales sin reentrenar el modelo, reduciendo alucinaciones.
  - *Bedrock Knowledge Bases:* Integración nativa "turnkey" con datastores vectoriales (OpenSearch Serverless, Pinecone, Amazon Aurora pgvector, etc.).
  - *Bedrock Agents:* Orquestación autónoma de llamadas a funciones/APIs (mediante AWS Lambda) y ejecución de tareas multi-paso complejas.
  - *Bedrock Guardrails:* Filtrado de contenido sensible (PII), prevención de ataques de inyección de prompts (jailbreaks) y bloqueo de temas no deseados.
  - *Fine-Tuning & Continued Pre-training:* Ajuste fino con datasets propios en S3 en un entorno seguro y aislado sin compartir datos con terceros ni reentrenar modelos base públicos.

#### B. Amazon SageMaker (Plataforma Completa para Científicos e Ingenieros de ML)
- **SageMaker Studio:** IDE integrado en la nube para todo el ciclo de vida de ML.
- **SageMaker JumpStart:** Catálogo de modelos preentrenados listos para desplegar en infraestructura dedicada con 1-click.
- **SageMaker Canvas:** Herramienta visual No-Code para crear modelos predictivos y probar FMs.
- **SageMaker Clarify:** Detección de sesgos (bias) en datos y modelos, y explicabilidad mediante SHAP values.
- **SageMaker Model Cards / Model Governance:** Documentación formal, ciclo de vida, linaje y auditoría de modelos para compliance.
- **SageMaker Pipelines:** Orquestación CI/CD y MLOps para automatizar el preprocesamiento, entrenamiento y despliegue.

#### C. Datastores para GenAI & RAG
- **Amazon OpenSearch Service / Serverless:** Motor de búsqueda semántica y almacenamiento de vectores a gran escala con índices k-NN.
- **Amazon Aurora PostgreSQL con extensión `pgvector`:** Almacenamiento relacional + vectorial ideal para aplicaciones transaccionales como AutoApp.
- **Amazon DocumentDB (con soporte vectorial) & Amazon Neptune Analytics:** Para grafos de conocimiento, bases de documentos y relaciones complejas.

#### D. Servicios de IA Gestionados (AWS Managed AI Services)
- **Amazon Rekognition:** Análisis visual de imágenes y videos (detección de objetos, vehículos, placas, moderación de imágenes).
- **Amazon Textract:** Extracción inteligente de texto estructurado, tablas y formularios de documentos (PDFs, facturas, documentos vehiculares).
- **Amazon Comprehend:** Procesamiento de lenguaje natural (NLP) para análisis de sentimiento, extracción de entidades clave y detección de PII.
- **Amazon Transcribe & Polly:** Speech-to-Text para transcripción de audio y Text-to-Speech con voces neuronales realistas.
- **Amazon Translate:** Traducción automática multilingüe de alta fidelidad.
- **Amazon Kendra:** Motor de búsqueda semántica empresarial basado en lenguaje natural y machine learning.

#### E. Herramientas de Desarrollo con IA
- **Amazon Q Developer (antes CodeWhisperer):** Asistente inteligente de código integrado en IDEs para generación, refactorización y auditoría de seguridad.
- **Amazon Q Business:** Asistente conversacional empresarial conectado a fuentes de datos corporativas con permisos y control de acceso.
- **PartyRock:** Entorno interactivo y lúdico para experimentar con Bedrock, prompt engineering y prototipado rápido de apps de IA.

#### F. Capa de Datos, Analítica y Gobernanza
- **Amazon S3:** Almacén de objetos que funciona como Data Lake centralizado para datasets de entrenamiento y documentos RAG.
- **AWS Glue:** Catálogo de metadatos centralizado y jobs de ETL serverless para preparación y limpieza de datos.
- **Amazon Athena:** Consultas SQL interactivas y serverless directamente sobre datos sin procesar o estructurados en S3.
- **AWS Lake Formation:** Gobernanza integral, control de accesos granular a nivel de fila/columna y seguridad sobre el Data Lake.

---

### 3. Aplicación Práctica e Impacto para AutoApp

1. **Arquitectura Serverless y Rentable:** Priorizar **Amazon Bedrock** para funcionalidades de asistente, chat, recomendaciones y soporte automatizado en AutoApp, evitando el alto costo fijo de instancias dedicadas en SageMaker salvo cuando se requiera fine-tuning pesado o inferencia de latencia ultrabaja en modelos propios.
2. **Implementación de RAG para AutoApp:**
   - Catálogo vehicular, manuales y datos técnicos almacenados en **Amazon S3**.
   - Embeddings vectoriales generados vía **Amazon Titan Embeddings** y persistidos en **Aurora PostgreSQL (`pgvector`)**.
   - Conexión mediante **Bedrock Knowledge Bases** para brindar respuestas certeras a los usuarios sin alucinaciones.
3. **Automatización de Documentos Vehiculares:**
   - Empleo de **Amazon Textract** para digitalizar fichas técnicas, pólizas de seguro o cédulas de autos subidas a AutoApp.
   - Empleo de **Amazon Rekognition** para validar fotos de vehículos (estado estético, daños, detección de matrículas).
4. **Seguridad, PII y Gobernanza:**
   - Despliegue de **Bedrock Guardrails** para filtrar datos sensibles de usuarios (números de tarjeta, DNI/identificaciones) y prevenir prompt injection.
   - Aislamiento de red mediante **VPC Endpoints (AWS PrivateLink)** y cifrado universal con **AWS KMS**.
