## Identidade

Você é um dev fullstack senior focado na construção de CRM para empresas.

## Contexto

Leia /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/README.md

## Modos operante

1. Entenda a missão
2. Verifique as rotas afetadas e rotas complementares que podem ajudar no desenvolvimento.
3. Estipule o plano
   [Aprovação do usuário]
4. Execute seguindo todas as regras.
5. Verifique erros.

## Objetivo

Quero ajustar algumas coisas no projeto especificadamente da parte de settings/organization

1. Configurar a tela de /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/app/(authenticated)/org/[orgSlug]/settings/organization para refletir mais a realidade de uma organização (empresa/pesssoa).

### Diretrizes da tela de configuração

A tela de organização pode ser considerada também uma tela de "dados cadastrais". Ela vai poder ser tanto CPF quanto CNPJ (na hora de fazer o fechamento da venda no checkout a pessoa vai escolher se quer cadastrar como pessoa física ou jurírica).

- A tela vai ser um grande form (tirando as opção de read-only) onde o usuário podera preencher e depois apertar o botão de salvar e enviar (na hora de fechar um plano ele vai preencher obrigatórimente mas aqui é uma opção também).
- CNPJ/CPF não são obrigatórios para contas free mas qualquer plano pago essa informação de empresa/pessoa são obrigatórias.

#### Campos na tela

- Acesso para tela deve ter os seguintes campos:

# Resumo de Dados Cadastrais (RD Station CRM)

Este resumo apresenta a lógica de campos para o faturamento, comparando as exigências para Pessoa Jurídica (Empresa) e Pessoa Física (Individual).

---

### 1. Comparativo de Identificação: Empresa vs. Pessoa

| Seção                    | Pessoa Jurídica (Empresa) | Pessoa Física (Individual)    |
| :----------------------- | :------------------------ | :---------------------------- |
| **Identificação Fiscal** | **CNPJ**                  | **CPF**                       |
| **Nome Legal**           | **Razão social**          | **Nome completo**             |
| **Identidade Comercial** | **Nome fantasia**         | Geralmente oculto ou opcional |
| **Regime Tributário**    | **Optante pelo Simples**  | Campo removido                |

---

### 2. Campos Fixos (Aparecem em ambos os casos)

Estes campos são obrigatórios para a manutenção do contato e logística de cobrança, independentemente do tipo de contribuinte selecionado.

#### Contato Financeiro

- **Nome completo do responsável**
- **Email**: Local onde as faturas serão enviadas
- **Telefone**: Com código de país e DDD

#### Endereço de Faturamento

- **CEP**
- **Endereço e Número**
- **Complemento** (opcional)
- **Bairro, Cidade e Estado**
- **País** (pré-selecionado como Brasil)

---

> **Lógica do Sistema:** A interface mantém a base de **contato e localização** idêntica para ambos os perfis, alternando apenas os campos de **identificação fiscal** para validar o faturamento de acordo com a natureza jurídica do cliente.

## Requisitos

Siga o arquivo /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/CLAUDE.md
