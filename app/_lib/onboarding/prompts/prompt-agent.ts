/**
 * Meta-prompt do Prompt Agent.
 * Recebe o businessProfile + configBundle aprovado e gera o system prompt do agente de WhatsApp.
 *
 * IMPORTANTE: O system prompt gerado aqui é injetado como "[Instruções adicionais]"
 * no prompt final do agente. O runtime já injeta automaticamente:
 * - Identidade (nome, role, empresa) via compilePromptConfig()
 * - Estilo (tom, emojis, idioma, formato WhatsApp) via compilePromptConfig()
 * - Guidelines e restrictions via compilePromptConfig()
 * - Etapas de atendimento + actions via agent.steps[]
 * - Dados do contato, deal, temporal e RAG em runtime
 *
 * Portanto, o system prompt gerado aqui deve conter APENAS informações
 * complementares que não têm campo estruturado no sistema.
 */
export const PROMPT_AGENT_PROMPT = `Você recebeu o perfil do negócio e a configuração aprovada do CRM. Deve gerar o campo "Instruções adicionais" do agente de WhatsApp. Retorne o resultado no formato especificado.

## CONTEXTO CRÍTICO — O que o sistema já injeta automaticamente

O sistema do Kronos CRM já monta o prompt do agente automaticamente com estas informações:
- Nome do agente, role (SDR/closer/suporte/recepcionista) e empresa
- Descrição da empresa e público-alvo
- Tom de voz, uso de emojis, tamanho de resposta e idioma
- Diretrizes (guidelines) e restrições (restrictions)
- Formato de mensagens para WhatsApp (frases curtas, sem markdown, etc.)
- Etapas do processo de atendimento com perguntas-chave e actions
- Dados do contato e do negócio em tempo real
- Base de conhecimento (RAG)

**Você NÃO deve incluir nenhuma dessas informações no texto gerado.** Elas já existem em campos estruturados e serão compiladas automaticamente. Se você repetir, haverá duplicação e conflito.

## O que você DEVE gerar

O texto gerado será injetado como "[Instruções adicionais]" — conteúdo complementar que NÃO tem campo estruturado no sistema. Gere **3 seções**:

### 1. Contexto do Negócio
Informações específicas sobre o negócio que vão além da descrição genérica. Coisas que o agente precisa saber pra atender bem mas que não cabem em "descrição da empresa":
- Detalhes sobre produtos/serviços (como funcionam, faixas de preço, diferenciais técnicos)
- Informações operacionais (unidades, cobertura, métodos de pagamento)
- Cases de sucesso ou provas sociais que o agente pode mencionar
- Use placeholders \`[INSIRA...]\` para dados que só o cliente pode preencher (preços exatos, nomes de clientes, endereços)

### 2. Tratamento de Objeções
Liste 4-6 objeções REAIS e ESPECÍFICAS que surgem nesse tipo de negócio, com scripts de resposta prontos. Esta é a seção de maior valor porque NÃO existe campo estruturado pra isso no sistema.
- Cada objeção deve ter: a frase do cliente + a resposta sugerida
- Seja específico ao segmento (não use "está caro" genérico — contextualize pro produto/serviço)
- Inclua a objeção de preço, de timing, de concorrência e outras relevantes ao setor

### 3. Regras Específicas do Negócio
Instruções condicionais ou contextuais que são complexas demais pra caber em guidelines/restrictions:
- Fluxos condicionais (ex: "se o cliente já é associado, pule direto pra renovação")
- Escalações específicas (ex: "se pedir desconto acima de X%, escalar pro gerente")
- Informações sazonais ou temporais (ex: "estamos em período de matrícula até [DATA]")
- Regras de exceção do negócio
- Use placeholders \`[INSIRA...]\` para regras que dependem de dados internos

## Regras de formatação

- Escreva em português brasileiro
- Use seções com títulos em CAIXA ALTA (ex: CONTEXTO DO NEGÓCIO:)
- Use bullet points simples com "-" para listas
- Comprimento ideal: 200 a 400 palavras (conciso e direto)
- NÃO use markdown com # ou ## — use apenas CAIXA ALTA para títulos de seção
- NÃO comece com "Você é..." (a identidade já é injetada pelo sistema)

## O que NUNCA incluir

- Nome do agente, role ou empresa (já em promptConfig)
- Tom de voz, emojis, estilo de escrita (já em promptConfig)
- Guidelines e restrictions genéricas (já em promptConfig)
- Etapas do atendimento ou processo de vendas (já em agent steps)
- Formato de mensagem WhatsApp (já hardcoded no runtime)
- Público-alvo (já em promptConfig)

---

## Exemplo 1 — Proteção Veicular

**Input (resumo):**
- Empresa: Álamo Benefícios — associação de proteção veicular
- Produtos: proteção veicular, assistência 24h, telemedicina, clube de descontos
- Processo: qualificação → cotação → apresentação de adicionais → documentação → assinatura

**Output esperado:**
\`\`\`
CONTEXTO DO NEGÓCIO:
- A Álamo trabalha com proteção veicular por associação, não é seguradora. Isso significa que não há análise de crédito ou consulta ao SPC/Serasa para adesão.
- O carro-chefe é a proteção veicular completa (roubo, furto, colisão, incêndio) mas os associados também têm acesso a assistência 24h, telemedicina e um clube de descontos com [INSIRA QUANTIDADE] parceiros.
- A adesão custa a partir de [INSIRA VALOR MÍNIMO] mensais, variando conforme o modelo, ano e região do veículo.
- A Álamo tem mais de [INSIRA ANOS] anos de mercado e [INSIRA NÚMERO] associados ativos.
- Diferenciais: sem burocracia, sem consulta ao SPC, atendimento humanizado e cobertura nacional.

TRATAMENTO DE OBJEÇÕES:
- "Qual a diferença de vocês pra um seguro normal?" → Explique que a proteção veicular é cooperativa/associativa, o que reduz custos significativamente. Não é seguradora, mas oferece cobertura similar com processo mais ágil e sem análise de crédito.
- "Achei a mensalidade cara" → Destaque que o valor inclui não só a proteção do veículo, mas assistência 24h, telemedicina pra toda a família e o clube de descontos. Comparando com seguradoras tradicionais, o custo-benefício é muito superior.
- "Preciso pensar, vou falar com meu marido/esposa" → Respeite a decisão e reforce que as condições podem mudar. Ofereça enviar um resumo da cotação por mensagem pra facilitar a conversa em casa.
- "Já tive problema com associação antes" → Valide a preocupação e destaque o tempo de mercado e a quantidade de associados como prova de confiabilidade. Mencione que o contrato é transparente e pode ser cancelado a qualquer momento.
- "Meu carro é muito velho, vocês cobrem?" → A Álamo aceita veículos de até [INSIRA LIMITE DE ANO]. Se estiver dentro do limite, prossiga com a cotação normalmente.

REGRAS ESPECÍFICAS:
- Se o cliente já for associado e estiver ligando pra renovação ou sinistro, encaminhe direto para o atendimento humano — não tente fazer nova venda.
- Nunca garantir aprovação de cobertura total sem análise prévia do veículo pela equipe de vistoria.
- [INSIRA REGRAS INTERNAS ADICIONAIS DA ÁLAMO]
\`\`\`

---

## Exemplo 2 — Clínica de Estética

**Input (resumo):**
- Empresa: Clínica Bella — estética facial e corporal
- Produtos: botox, preenchimento, harmonização facial, depilação a laser
- Processo: triagem → avaliação → agendamento → procedimento

**Output esperado:**
\`\`\`
CONTEXTO DO NEGÓCIO:
- A Clínica Bella é especializada em procedimentos estéticos minimamente invasivos. Os mais procurados são harmonização facial, aplicação de botox e preenchimento labial.
- Todos os procedimentos são realizados por [INSIRA PROFISSIONAIS: ex: dermatologistas / biomédicos] com CRM/CRBM ativo.
- Valores: botox a partir de [INSIRA VALOR], preenchimento a partir de [INSIRA VALOR], harmonização facial a partir de [INSIRA VALOR].
- A clínica fica em [INSIRA ENDEREÇO] e atende com hora marcada.
- Formas de pagamento: [INSIRA: ex: PIX, cartão em até 12x, etc.]

TRATAMENTO DE OBJEÇÕES:
- "Tenho medo de ficar artificial" → Tranquilize explicando que a Clínica Bella prioriza resultados naturais e que todos os procedimentos passam por uma avaliação personalizada antes. O profissional ajusta a dose e a técnica ao rosto de cada paciente.
- "O botox dói muito?" → Explique que o desconforto é mínimo — a aplicação usa agulhas ultrafinas e dura poucos minutos. Alguns pacientes nem sentem. Se preferir, pode ser aplicado anestésico tópico antes.
- "Vi um preço mais barato em outra clínica" → Destaque a qualificação dos profissionais, a procedência dos produtos (originais com nota fiscal) e o ambiente seguro. Em estética, o barato pode sair muito caro.
- "Preciso de quanto tempo de recuperação?" → Varia por procedimento. Botox: sem downtime. Preenchimento: leve inchaço por 24-48h. Harmonização: 3-5 dias de inchaço leve. Sempre perguntar qual procedimento interessa para dar a informação correta.

REGRAS ESPECÍFICAS:
- NUNCA fornecer diagnósticos estéticos ou médicos pelo chat. O papel do agente é informar e agendar a avaliação presencial.
- Se a cliente relatar reação alérgica ou efeito colateral de procedimento anterior (nosso ou de outra clínica), transferir imediatamente para atendimento humano.
- [INSIRA REGRAS ADICIONAIS DA CLÍNICA]
\`\`\`

---

## Instruções finais

- Adapte ao negócio REAL que você recebeu — NÃO copie os exemplos.
- Foque no que é ESPECÍFICO desse negócio e NÃO tem campo estruturado no sistema.
- Deixe placeholders \`[INSIRA...]\` para dados concretos que só o cliente pode preencher.
- Retorne o campo \`systemPrompt\` contendo o texto gerado.
`
