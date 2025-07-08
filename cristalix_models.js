function base64ToBlob(base64, mimeType = 'image/png') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], {type: mimeType});
}

function blobToDataURL(buffer, mimeType) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return `data:${mimeType};base64,${base64}`;
}

function cleanUp(elements) {
    //todo: mb not needed
    while (elements.length != 0) {
        elements.forEach(element => {
            try {
                element.remove(false);
            } catch (e) {

            }
        })
    }
}

function exportToCristalixModel(zip) {
    const texture = Texture.all[0];
    if (texture) {
        const textureBlob = base64ToBlob(texture.getBase64());
        zip.file(`model.png`, textureBlob);
    } else {
        Blockbench.showMessageBox({
            title: "Ошибка",
            message: "Нет текстуры в проекте"
        });
        throw new Error("No any textures in project")
        return;
    }

    const model = Codecs.bedrock.compile({
        animate: true,
        stringify: true
    });
    zip.file("model.json", model);

    if (Animation.all.length != 0) {
        const animations = Animator.buildFile(null, null);
        Object.keys(animations.animations).forEach(key => {
            if (key.includes("_")) {
                Blockbench.showMessageBox({
                    title: "Ошибка",
                    message: "В названии анимации используется недоступный символ '\\_': " + key.replace('_', '\\_')
                });
                throw new Error("Invalid animation name: " + key)
            }
        })
        zip.file("model.animation", JSON.stringify(animations, null, 4));
    }
}

async function importFromCristalixModel(zip, overwrite) {
    let modelData, animationData, textureData;

    for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.endsWith('.json')) {
            modelData = await file.async('string');
        } else if (filename.endsWith('.animation')) {
            animationData = await file.async('string');
        } else if (filename.endsWith('.png')) {
            textureData = await file.async('arraybuffer');
        }
    }

    if (!modelData || !textureData) {
        Blockbench.showMessageBox({
            title: "Ошибка",
            message: `Модель повреждена`
        });
        return;
    }

    if (overwrite) {
        cleanUp(Animation.all);
        cleanUp(Texture.all);
        cleanUp(Outliner.elements);
        cleanUp(Outliner.root);
    }

    try {
        const textureDataURL = blobToDataURL(textureData, 'image/png');
        const texture = new Texture();
        texture.fromDataURL(textureDataURL);
        texture.add(true);
        texture.saved = true;
    } catch (e) {
        console.log(e);
        Blockbench.showMessageBox({
            title: "Ошибка",
            message: `Текстура повреждена`
        });
        return;
    }

    try {
        const parsedModel = JSON.parse(modelData);
        Codecs.bedrock.parse(parsedModel, null);
    } catch (e) {
        console.log(e);
        Blockbench.showMessageBox({
            title: "Ошибка",
            message: `Модель повреждена`
        });
        return;
    }

    if (animationData) {
        try {
            Animator.importFile({content: animationData}, false)
        } catch (e) {
            console.log(e);
            Blockbench.showMessageBox({
                title: "Ошибка",
                message: `Анимации повреждены`
            });
            return;
        }
    }

    Formats.cristalix_model.select();
    Project.codec = cristalix_model_codec;
    Project.format = Formats.cristalix_model;
}

async function importModel(content, overwrite) {
    var model = await JSZip.loadAsync(content);
    importFromCristalixModel(model, overwrite);
}

async function exportModel() {
    const zip = await cristalix_model_codec.compile();

    zip.generateAsync({type: "blob"}).then(async (content) => {
        const arrayBuffer = await content.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        Blockbench.export({
            resource_id: "cristalix_model_export",
            type: "Cristalix Model",
            extensions: ['model', 'zip'],
            name: Project.name + ".model",
            content: buffer
        }, path => cristalix_model_codec.afterSave(path));
    }).catch(err => {
        Blockbench.showMessageBox({
            title: "Ошибка",
            message: `Не удалось сохранить модель: ${err.message}`
        });
    });
}

const cristalix_model_codec = new Codec('cristalix_model', {
    name: 'Cristalix Model',
    extension: 'model',
    load_filter: {
        type: 'text',
        extensions: ['model', 'zip']
    },
    async load(data, file, add = true) {
        setupProject(Formats.cristalix_model)

        var name = pathToName(file.path, true);
        Blockbench.read([file.path], {
            readtype: 'buffer'
        }, files => {
            importModel(files[0].content, true);
            addRecentProject({
                name: pathToName(file.path, true),
                path: file.path,
                icon: Format.cristalix_model
            });
            Project.name = pathToName(file.path, false);
            Project.export_path = file.path;
            Project.saved = true;
        })
    },
    async parse(data, path) {
        Blockbench.read([file.path], {
            readtype: 'buffer'
        }, files => importModel(files[0].content, true))
    },
    async compile(any) {
        const zip = new JSZip();

        exportToCristalixModel(zip);

        return zip;
    },
    async overwrite(content, path, cb) {
        cristalix_model_codec.write(cristalix_model_codec.compile(), path);
    },
    async write(content, path) {
        var zip = await content;
        zip.generateAsync({type: "blob"}).then(async (content) => {
            const arrayBuffer = await content.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            Blockbench.writeFile(path, {
                content: buffer,
                savetype: 'buffer'
            }, rs => cristalix_model_codec.afterSave(path));
        }).catch(err => {
            console.log(err);
            Blockbench.showMessageBox({
                title: "Ошибка",
                message: `Не удалось сохранить модель: ${err.message}`
            });
        });
    },
    afterSave(path) {
        Project.saved = true;
        Texture.all.forEach(tex => tex.saved = true);
        Project.save_path = path;
    },
    async export() {
        exportModel();
    }
});

const actions = {
    "file.export": [
        new Action("export_cristalix_model", {
            name: "Export Cristalix Model",
            icon: "fa-gem",
            category: "file",
            click: exportModel
        })
    ],
    "file.import": [
        new Action("import_cristalix_model", {
            name: "Import Cristalix Model",
            icon: "fa-gem",
            category: "file",
            click: async function () {
                Blockbench.import({
                    extensions: ['model', 'zip'],
                    type: 'Cirtalix Model',
                    multiple: false,
                    readtype: 'buffer'
                }, async function (files) {
                    await importModel(files[0].content, false);
                })
            }
        }),
        new Action("import_overwrite_cristalix_model", {
            name: "Import Cristalix Model (Overwrite)",
            icon: "fa-gem",
            category: "file",
            click: async function () {
                Blockbench.import({
                    extensions: ['model', 'zip'],
                    type: 'Cirtalix Model',
                    multiple: false,
                    readtype: 'buffer'
                }, async function (files) {
                    await importModel(files[0].content, true);
                })
            }
        })
    ]
}

Plugin.register("cristalix_models", {
    title: "Cristalix Models",
    author: "dargen",
    description: "Support export/import in Cristalix model format",
    version: "1.0.0",
    variant: "both",
    icon: 'icon.png',

    onload() {
        const format = new ModelFormat('cristalix_model', {
            id: 'cristalix_model',
            name: 'Cristalix Model',
            description: 'A Cristalix model format',
            icon: 'fa-gem',
            category: 'general',
            target: ['Cristalix Model'],
            show_on_start_screen: true,
            format_page: {
                content: ''
            },
            extension: 'model',
            animation_mode: true,
            single_texture: false,
            bone_rig: true,
            rotate_cubes: true,
            optional_box_uv: true,
            centered_grid: true,
            onSetup(project) {
                if (isApp) {
                    project.BedrockEntityManager = new BedrockEntityManager(project);
                }
            }
        });

        Codecs['cristalix_model'] = cristalix_model_codec;
        Formats.cristalix_model.codec = cristalix_model_codec;

        for (const [category, actionsList] of Object.entries(actions)) {
            actionsList.forEach(action => {
                MenuBar.addAction(action, category)
            })
        }
    },

    onunload() {
        for (const [category, actionsList] of Object.entries(actions)) {
            actionsList.forEach(action => {
                MenuBar.removeAction(`${category}.${action.id}`)
            })
        }
        delete Codecs['cristalix_model'];
    }
});
