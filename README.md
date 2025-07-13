# Плагин BlockBench для работы с моделями Cristalix

Плагин для BlockBench позволяет легко редактировать, импортировать и экспортировать модели в формате Cristalix.

**URL для установки плагина**: https://raw.githubusercontent.com/asyncdargen/cristalix-model-blockbench/refs/heads/main/cristalix_models.js

## Формат модели Cristalix

**Поддерживаемые расширения**: `.model`, `.zip`

### Структура архива модели:
- **model.png** — файл текстуры модели
- **model.json** — файл с описанием модели и её костей
- **model.animation** — файл с анимациями модели

## Возможности плагина

### Export
- **Export Cristalix Model** — экспорт одной модели с выбранной текстурой
- **Export Cristalix Model (Per Texture)** — экспорт моделей для каждой текстуры в проекте в указанную папку
- **Export Cristalix Model (Per Texture - Name Generator)** — экспорт моделей для каждой текстуры с использованием заданного генератора имен (по умолчанию `tex.name`)
- **Export Cristalix Model (Per Texture - Manual)** — экспорт моделей для каждой текстуры с ручным выбором файлов назначения

### Import
- **Import Cristalix Model** — импорт модели из файла `.zip` или `.model` в текущий проект
- **Import Cristalix Model (Overwrite)** — импорт модели из файла `.zip` или `.model` в текущий проект с перезаписью всех костей, анимаций и текстур

### Edit
- **Fix Cristalix animations** — исправляет название анимаций (удаляет запрещенный символ `_`)
- **Link Cristalix animations** — автоматически (по названием) определяет анимации встроенные в клиент и устанавливает им нужные названия (`walk`, `stand`, `hurt`, `death`)
- **Detect Cristalix model `(experimental)`** - эксперементальная функция, в некоторых случаях верно обрабатывает и переименовывает группы модели под Body и Head

### Project
- **Create Cristalix Model** — создание новой модели Cristalix
- **Import Cristalix Model Project** — импорт модели Cristalix как нового проекта
