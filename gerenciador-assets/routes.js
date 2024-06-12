const express = require('express');
const mongoose = require('mongoose');
const Employee = require('./models/Employee');

const router = express.Router();

// Configuração da conexão com MongoDB
const uriConexao = "mongodb://localhost:27017/it";
mongoose.connect(uriConexao, { useNewUrlParser: true, useUnifiedTopology: true });

const ASSETS_PERMITIDOS = new Set(['notebook', 'desktop', 'monitor1', 'monitor2', 'teclado', 'mouse', 'nobreak', 'headset', 'celular', 'acessorios']);


function obterValoresPadrao(tipoAsset) {
    const valoresPadrao = {};
    switch(tipoAsset) {
        case 'notebook':
        case 'desktop':
            return { tag: 'Não informado', modelo: 'Não informado', numero_serial: 'Não informado', versao: 'Não informado', caracteristicas: 'Não informado', observacao: 'Não informado' };
        case 'monitor1':
        case 'monitor2':
        case 'teclado':
        case 'mouse':
        case 'nobreak':
        case 'headset':
            return { modelo: 'Não informado', numero_serial: 'Não informado', observacao: 'Não informado' };
        case 'celular':
            return { modelo: 'Não informado', imei1: 'Não informado', numero: 'Não informado', observacao: 'Não informado' };
        case 'acessorios':
            return { suporte_notebook: false, mousepad: false };
        default:
            return valoresPadrao;
    }
}

// Inicio rotas de funcionario

//Inserir um funcionário
router.post('/funcionario', async (req, res) => {
    try {
        const { cpf, nome } = req.body;

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        if (!nome) {
            return res.status(400).json({ mensagem: 'Nome não pode ser vazio' });
        }

        const chavesInvalidas = Object.keys(req.body).filter(key => !['cpf', 'nome'].includes(key));
        if (chavesInvalidas.length) {
            return res.status(400).json({ mensagem: `Chaves inválidas fornecidas: ${chavesInvalidas.join(', ')}` });
        }

        const dadosFuncionario = {
            _id: cpf,
            nome: nome
        };

        await Employee.create(dadosFuncionario);
        return res.status(201).json({ mensagem: `Funcionário ${nome} inserido com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Listar todos os funcionários
router.get('/funcionario', async (req, res) => {
    try {
        const funcionarios = await Employee.find({}, '_id nome assets');
        return res.status(200).json(funcionarios);
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Recuperar inventário do funcionário
router.get('/funcionario/:cpf', async (req, res) => {
    try {
        const { cpf } = req.params;

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        const funcionario = await Employee.findById(cpf);
        if (!funcionario) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        return res.status(200).json({ assets: funcionario.assets });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Atualizar nome do funcionário
router.put('/funcionario/:cpf', async (req, res) => {
    try {
        const { cpf } = req.params;
        const { nome } = req.body;

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        if (!nome) {
            return res.status(400).json({ mensagem: 'Nome não pode ser vazio' });
        }

        const resultado = await Employee.updateOne({ _id: cpf }, { $set: { nome } });
        if (resultado.nModified === 0) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        return res.status(200).json({ mensagem: 'Nome do funcionário atualizado com sucesso' });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Deletar um funcionário
router.delete('/funcionario/:cpf', async (req, res) => {
    try {
        const { cpf } = req.params;

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        const resultado = await Employee.deleteOne({ _id: cpf });
        if (resultado.deletedCount === 0) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        return res.status(200).json({ mensagem: `Funcionário ${cpf} deletado com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});



//Inserir assets para um funcionário
router.post('/funcionario/:cpf/asset', async (req, res) => {
    try {
        const { cpf } = req.params;
        const assets = req.body;

        if (!assets) {
            return res.status(400).json({ mensagem: 'Pelo menos um asset deve ser fornecido' });
        }

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        const invalidAssets = Object.keys(assets).filter(asset => !ASSETS_PERMITIDOS.has(asset));
        if (invalidAssets.length) {
            return res.status(400).json({ mensagem: `Tipos de assets inválidos: ${invalidAssets.join(', ')}` });
        }

        const invalidAttributes = {};
        for (const [assetType, assetInfo] of Object.entries(assets)) {
            const defaultValues = obterValoresPadrao(assetType);
            const invalidAttrs = Object.keys(assetInfo).filter(attr => !(attr in defaultValues));
            if (invalidAttrs.length) {
                invalidAttributes[assetType] = invalidAttrs;
            }

            if (assetType === 'acessorios') {
                for (const [attr, value] of Object.entries(assetInfo)) {
                    if (attr in defaultValues && typeof value !== 'boolean') {
                        invalidAttributes[assetType] = invalidAttributes[assetType] || [];
                        invalidAttributes[assetType].push(attr);
                    }
                }
            }
        }

        if (Object.keys(invalidAttributes).length) {
            return res.status(400).json({ mensagem: 'Atributos inválidos para assets', invalidAttributes });
        }

        const funcionario = await Employee.findById(cpf);
        if (!funcionario) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        if (!funcionario.assets) {
            funcionario.assets = new Map();
        }

        for (const [assetType, assetInfo] of Object.entries(assets)) {
            if (funcionario.assets.has(assetType)) {
                return res.status(400).json({ mensagem: `Funcionário já possui um ${assetType}` });
            }

            const defaultValues = obterValoresPadrao(assetType);
            const assetData = { ...defaultValues, ...assetInfo };
            funcionario.assets.set(assetType, assetData);
        }

        await funcionario.save();
        return res.status(201).json({ mensagem: 'Assets inseridos com sucesso' });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Atualizar asset de um funcionário
router.put('/funcionario/:cpf/asset/:asset', async (req, res) => {
    try {
        const { cpf, asset } = req.params;
        const data = req.body;

        if (!data) {
            return res.status(400).json({ mensagem: 'Nenhum dado fornecido para atualização' });
        }

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        const funcionario = await Employee.findById(cpf);
        if (!funcionario) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        const assets = funcionario.assets || {};
        if (!assets[asset]) {
            return res.status(404).json({ mensagem: `Asset ${asset} não encontrado para este funcionário` });
        }

        const defaultValues = obterValoresPadrao(asset);
        const invalidAttributes = Object.keys(data).filter(attr => !(attr in defaultValues));
        if (invalidAttributes.length) {
            return res.status(400).json({ mensagem: `Atributos inválidos para asset ${asset}: ${invalidAttributes.join(', ')}` });
        }

        Object.keys(data).forEach(key => {
            assets[asset][key] = data[key];
        });

        funcionario.markModified('assets');
        await funcionario.save();

        return res.status(200).json({ mensagem: `Informações do asset ${asset} atualizadas com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Deletar asset de um funcionário
router.delete('/funcionario/:cpf/asset/:asset', async (req, res) => {
    try {
        const { cpf, asset } = req.params;

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        const funcionario = await Employee.findById(cpf);
        if (!funcionario) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        if (!funcionario.assets.has(asset)) {
            return res.status(404).json({ mensagem: 'Asset não encontrado' });
        }

        funcionario.assets.delete(asset);
        await funcionario.save();

        return res.status(200).json({ mensagem: `Asset ${asset} deletado com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Transferir asset de um funcionário para outro
router.post('/funcionario/:cpfOrigem/transferir/:cpfDestino/asset/:tipoAsset', async (req, res) => {
    try {
        const { cpfOrigem, cpfDestino, tipoAsset } = req.params;

        if (cpfOrigem.length !== 11 || cpfDestino.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        if (!ASSETS_PERMITIDOS.has(tipoAsset)) {
            return res.status(400).json({ mensagem: 'Tipo de asset inválido' });
        }

        const origem = await Employee.findById(cpfOrigem);
        const destino = await Employee.findById(cpfDestino);

        if (!origem) {
            return res.status(404).json({ mensagem: 'Funcionário de origem não encontrado' });
        }

        if (!destino) {
            return res.status(404).json({ mensagem: 'Funcionário de destino não encontrado' });
        }

        if (!origem.assets.has(tipoAsset)) {
            return res.status(400).json({ mensagem: `Funcionário de origem não possui o asset ${tipoAsset}` });
        }

        if (destino.assets.has(tipoAsset)) {
            return res.status(400).json({ mensagem: `Funcionário de destino já possui o asset ${tipoAsset}` });
        }

        const assetData = origem.assets.get(tipoAsset);
        origem.assets.delete(tipoAsset);
        destino.assets.set(tipoAsset, assetData);

        await origem.save();
        await destino.save();

        return res.status(200).json({ mensagem: `Asset ${tipoAsset} transferido de ${cpfOrigem} para ${cpfDestino} com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});



module.exports = router;
