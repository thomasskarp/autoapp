# 🤝 Guía de Contribución — AutoApp

¡Gracias por tu interés en contribuir a AutoApp! Valoramos todas las colaboraciones, desde correcciones ortográficas en la documentación hasta optimizaciones de rendimiento y mejoras en las integraciones.

## Código de Conducta

Buscamos mantener un ambiente colaborativo, respetuoso, constructivo y humilde. Reconocemos que el desarrollo de software es un proceso de aprendizaje continuo y valoramos la diversidad de opiniones y enfoques técnicos.

## ¿Cómo Empezar?

1. **Haz un Fork** del repositorio en GitHub.
2. **Crea una rama descriptiva** para tu aporte:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   # o
   git checkout -b fix/correccion-error
   ```
3. **Instala las dependencias y corre los tests**:
   ```bash
   npm install
   npm run build
   ```
4. **Prueba los scripts modulares** para comprobar que no existan regresiones en seguridad o rendimiento:
   ```bash
   node scripts/test_security_phase1.mjs
   node scripts/test_phase2_performance.mjs
   ```

## Estándares de Código

- **Tipado estricto:** Mantener las normas de TypeScript (`strict: true`) sin usar `any` injustificado.
- **Validación con Zod:** Toda entrada o salida de IA / APIs externas debe contar con su esquema tipado.
- **Mensajes de Commit:** Preferimos la convención Conventional Commits:
  - `feat:` Nueva funcionalidad
  - `fix:` Corrección de bug
  - `docs:` Cambios en documentación
  - `refactor:` Refactorización sin alterar comportamiento
  - `perf:` Mejoras de rendimiento
  - `test:` Inclusión o ajuste de suites de prueba

## Envío de Pull Requests

1. Asegúrate de que el código compila limpiamente (`npm run build` sin errores).
2. Documenta claramente en la descripción del PR qué problema resuelve y cómo fue verificado.
3. Mantén los cambios lo más atómicos y focalizados posible.

¡Muchas gracias por colaborar!
