const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    tag: String,
    modelo: String,
    numero_serial: String,
    versao: String,
    caracteristicas: String,
    observacao: String,
    imei1: String,
    numero: String,
    suporte_notebook: Boolean,
    mousepad: Boolean
}, { _id: false });

const empregadoSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    nome: {
        type: String,
        required: true
    },
    assets: {
        type: Map,
        of: assetSchema,
        default: {}
    }
});

module.exports = mongoose.model('Empregado', empregadoSchema);
