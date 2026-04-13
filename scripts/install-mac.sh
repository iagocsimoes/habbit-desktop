#!/bin/bash

APP_PATH="/Applications/Habbit.app"

if [ ! -d "$APP_PATH" ]; then
  echo "Habbit nao encontrado em /Applications."
  echo "Arraste o Habbit para a pasta Aplicativos primeiro."
  exit 1
fi

echo "Removendo bloqueio do macOS..."
xattr -cr "$APP_PATH"
echo "Pronto! Agora voce pode abrir o Habbit normalmente."
open "$APP_PATH"
