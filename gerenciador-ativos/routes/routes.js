const express = require('express');
const mongoose = require('mongoose');
const Empregado = require('../models/Empregado');

const router = express.Router();

// Configuração da conexão com MongoDB
const uriConexao = "mongodb://localhost:27017/inventario";
mongoose.connect(uriConexao, { useNewUrlParser: true, useUnifiedTopology: true });

const ATIVOS_PERMITIDOS = new Set(['notebook', 'desktop', 'monitor1', 'monitor2', 'teclado', 'mouse', 'nobreak', 'headset', 'celular', 'acessorios']);


function obterValoresPadrao(tipoAtivo) {
    const valoresPadrao = {};
    switch(tipoAtivo) {
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

        await Empregado.create(dadosFuncionario);
        return res.status(201).json({ mensagem: `Funcionário ${nome} inserido com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Listar todos os funcionários
router.get('/funcionario', async (req, res) => {
    try {
        const funcionarios = await Empregado.find({}, '_id nome ativo');
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

        const funcionario = await Empregado.findById(cpf);
        if (!funcionario) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        return res.status(200).json({ ativos: funcionario.ativos });
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

        const resultado = await Empregado.updateOne({ _id: cpf }, { $set: { nome } });
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

        const resultado = await Empregado.deleteOne({ _id: cpf });
        if (resultado.deletedCount === 0) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        return res.status(200).json({ mensagem: `Funcionário ${cpf} deletado com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});



//Inserir ativos para um funcionário
router.post('/funcionario/:cpf/ativo', async (req, res) => {
    try {
        const { cpf } = req.params;
        const ativos = req.body;

        if (!ativos) {
            return res.status(400).json({ mensagem: 'Pelo menos um ativo deve ser fornecido' });
        }

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        const invalidoAtivos = Object.keys(ativos).filter(ativo => !ATIVOS_PERMITIDOS.has(ativo));
        if (invalidoAtivos.length) {
            return res.status(400).json({ mensagem: `Tipos de ativos inválidos: ${invalidoAtivos.join(', ')}` });
        }

        const invalidAttributes = {};
        for (const [ativoTipo, ativoInfo] of Object.entries(ativos)) {
            const defaultValues = obterValoresPadrao(ativoTipo);
            const invalidAttrs = Object.keys(ativoInfo).filter(attr => !(attr in defaultValues));
            if (invalidAttrs.length) {
                invalidAttributes[ativoTipo] = invalidAttrs;
            }

            if (ativoTipo === 'acessorios') {
                for (const [attr, value] of Object.entries(ativoInfo)) {
                    if (attr in defaultValues && typeof value !== 'boolean') {
                        invalidAttributes[ativoTipo] = invalidAttributes[ativoTipo] || [];
                        invalidAttributes[ativoTipo].push(attr);
                    }
                }
            }
        }

        if (Object.keys(invalidAttributes).length) {
            return res.status(400).json({ mensagem: 'Atributos inválidos para ativos', invalidAttributes });
        }

        const funcionario = await Empregado.findById(cpf);
        if (!funcionario) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        if (!funcionario.ativos) {
            funcionario.ativos = new Map();
        }

        for (const [ativoTipo, ativoInfo] of Object.entries(ativos)) {
            if (funcionario.ativos.has(ativoTipo)) {
                return res.status(400).json({ mensagem: `Funcionário já possui um ${ativoTipo}` });
            }

            const defaultValues = obterValoresPadrao(ativoTipo);
            const ativoDados = { ...defaultValues, ...ativoInfo };
            funcionario.ativos.set(ativoTipo, ativoDados);
        }

        await funcionario.save();
        return res.status(201).json({ mensagem: 'Ativos inseridos com sucesso' });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Atualizar ativo de um funcionário
router.put('/funcionario/:cpf/ativo/:ativo', async (req, res) => {
    try {
        const { cpf, ativo } = req.params;
        const data = req.body;

        if (!data) {
            return res.status(400).json({ mensagem: 'Nenhum dado fornecido para atualização' });
        }

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        const funcionario = await Empregado.findById(cpf);
        if (!funcionario) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        const ativos = funcionario.ativos || {};
        if (!ativos[ativo]) {
            return res.status(404).json({ mensagem: `Ativo ${ativo} não encontrado para este funcionário` });
        }

        const defaultValues = obterValoresPadrao(ativo);
        const invalidAttributes = Object.keys(data).filter(attr => !(attr in defaultValues));
        if (invalidAttributes.length) {
            return res.status(400).json({ mensagem: `Atributos inválidos para ativo ${ativo}: ${invalidAttributes.join(', ')}` });
        }

        Object.keys(data).forEach(key => {
            ativos[ativo][key] = data[key];
        });

        funcionario.markModified('ativos');
        await funcionario.save();

        return res.status(200).json({ mensagem: `Informações do ativo ${ativo} atualizadas com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Deletar ativo de um funcionário
router.delete('/funcionario/:cpf/ativo/:ativo', async (req, res) => {
    try {
        const { cpf, ativo } = req.params;

        if (cpf.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        const funcionario = await Empregado.findById(cpf);
        if (!funcionario) {
            return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
        }

        if (!funcionario.ativos.has(ativo)) {
            return res.status(404).json({ mensagem: 'Ativo não encontrado' });
        }

        funcionario.ativos.delete(ativo);
        await funcionario.save();

        return res.status(200).json({ mensagem: `Ativo ${ativo} deletado com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});

//Transferir ativo de um funcionário para outro
router.post('/funcionario/:cpfOrigem/transferir/:cpfDestino/ativo/:tipoAtivo', async (req, res) => {
    try {
        const { cpfOrigem, cpfDestino, tipoAtivo } = req.params;

        if (cpfOrigem.length !== 11 || cpfDestino.length !== 11) {
            return res.status(400).json({ mensagem: 'CPF deve ter 11 dígitos' });
        }

        if (!ATIVOS_PERMITIDOS.has(tipoAtivo)) {
            return res.status(400).json({ mensagem: 'Tipo de ativo inválido' });
        }

        const origem = await Empregado.findById(cpfOrigem);
        const destino = await Empregado.findById(cpfDestino);

        if (!origem) {
            return res.status(404).json({ mensagem: 'Funcionário de origem não encontrado' });
        }

        if (!destino) {
            return res.status(404).json({ mensagem: 'Funcionário de destino não encontrado' });
        }

        if (!origem.ativos.has(tipoAtivo)) {
            return res.status(400).json({ mensagem: `Funcionário de origem não possui o ativo ${tipoAtivo}` });
        }

        if (destino.ativos.has(tipoAtivo)) {
            return res.status(400).json({ mensagem: `Funcionário de destino já possui o ativo ${tipoAtivo}` });
        }

        const ativoDados = origem.ativos.get(tipoAtivo);
        origem.ativos.delete(tipoAtivo);
        destino.ativos.set(tipoAtivo, ativoDados);

        await origem.save();
        await destino.save();

        return res.status(200).json({ mensagem: `Ativo ${tipoAtivo} transferido de ${cpfOrigem} para ${cpfDestino} com sucesso` });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Ocorreu um erro', erro: error.message });
    }
});



module.exports = router;
