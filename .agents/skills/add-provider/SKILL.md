---
name: add-provider
description: Úsala siempre que tengas que implementar un nuevo proveedor de modelos.
---

# Proveedores en CV-Automizer
Los proovedores son las capas que permiten comunicar el proyectos con modelos de inteligencia artificial. 
Cada proveedor podrá servir unos modelos distintos que, de primeras, no tenemos por qué conocer.

## Reglas
- El proveedor debe ser agnostico a la generación, por lo que debe SIEMPRE ir en una capa independiente. Modelo ≠ Resultado.
- El proveedor debe siempre utilizar el JSON-schema. En caso de necesitar una adaptación por una incompatibilidad REFLEJADA en la documentación del proveedor, podrá incluirse un JSON-Schema propio.
- En caso de necesitarse un JSON-Schema propio, este SIEMPRE deberá seguir las pautas del Schema general, no pudiendo añadir campos o tipos inexistentes.
- Si se necesita de una API-KEY, deberá especificarse dentro del .env.example.

## Checklist de revisión
- [ ] ¿El proveedor sigue el JSON-Schema a la hora de lanzarse la solicitud?
- [ ] ¿El proveedor es indiferente en la capa de generación?
- [ ] En caso de error, ¿Está correctamente formateado el mensaje de error para que el usuario lo conozca?

## Al terminar
Comprueba que se ha cumplido toda la checklist y justifica como has comprobado cada uno de los puntos.