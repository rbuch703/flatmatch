#!/bin/bash

java -jar ~/Downloads/ClosureCompiler/compiler.jar --js_output_file combined.js -O SIMPLE \
    apartment.js    \
    apartmentMap.js \
    collisionHandling.js \
    buildingsBerlin.js    \
    controller.js   \
    gl-matrix.js    \
    glu.js          \
    helpers.js      \
    jquery.js       \
    jquery-ui.js    \
    main.js         \
    mapLayer.js     \
    math.js         \
    poly2tri.js     \
    shaders.js      \
    shadows.js      \
    skydome.js      \
    sun.js          \
    tile.js         \
    vicinityMap.js  \
    uiElements.js

