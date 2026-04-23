/**
 * Meta-prompt do Steps Agent.
 * Recebe o businessProfile + pipeline stages e gera as etapas de atendimento do agente.
 *
 * Few-shot examples com 2 negócios diferentes pra demonstrar que keyQuestions
 * devem ser totalmente personalizadas ao segmento.
 */
export const STEPS_AGENT_PROMPT = `Você recebeu o perfil do negócio e os pipeline stages aprovados. Deve gerar as etapas de atendimento do agente de WhatsApp (agent steps). Retorne o resultado no formato especificado.

## Estrutura de uma etapa (step)

Cada step tem:
- **name**: Nome curto e descritivo da etapa (ex: "Abertura e Triagem")
- **objective**: Descrição do objetivo principal da etapa para o agente executar
- **keyQuestion**: Pergunta principal ou abertura sugerida (string ou null)
- **messageTemplate**: Template de mensagem sugerido (string ou null; use null se keyQuestion já cobrir)
- **order**: Número sequencial começando em 0
- **actions**: Array de ações que o agente pode executar nessa etapa (mínimo 1 por step)

## Tipos de ações disponíveis

### move_deal
Move o deal para uma stage do pipeline.
\`\`\`json
{ "type": "move_deal", "trigger": "quando ocorre", "targetStagePosition": 1 }
\`\`\`
**IMPORTANTE**: \`targetStagePosition\` deve ser um dos positions dos stages recebidos como input.

### update_contact
Atualiza dados do contato.
\`\`\`json
{ "type": "update_contact", "trigger": "quando ocorre" }
\`\`\`

### update_deal
Atualiza campos do deal.
\`\`\`json
{
  "type": "update_deal",
  "trigger": "quando ocorre",
  "allowedFields": ["title", "value", "priority", "notes"],
  "allowedStatuses": [],
  "fixedPriority": "high",
  "notesTemplate": "template opcional"
}
\`\`\`
Campos válidos em allowedFields: "title", "value", "priority", "expectedCloseDate", "notes"
allowedStatuses pode incluir: "WON", "LOST"

### create_task
Cria uma tarefa de follow-up.
\`\`\`json
{ "type": "create_task", "trigger": "quando ocorre", "title": "título da tarefa", "dueDaysOffset": 2 }
\`\`\`

### list_availability
Lista horários disponíveis na agenda.
\`\`\`json
{ "type": "list_availability", "trigger": "quando ocorre", "daysAhead": 5, "slotDuration": 45, "startTime": "08:00", "endTime": "18:00" }
\`\`\`

### create_event
Cria um evento/agendamento na agenda.
\`\`\`json
{
  "type": "create_event",
  "trigger": "quando ocorre",
  "titleInstructions": "Reunião de Discovery",
  "duration": 45,
  "startTime": "08:00",
  "endTime": "18:00",
  "allowReschedule": true,
  "rescheduleInstructions": "instrução de reagendamento"
}
\`\`\`

### hand_off_to_human
Transfere o atendimento para um humano.
\`\`\`json
{
  "type": "hand_off_to_human",
  "trigger": "quando ocorre",
  "notifyTarget": "deal_assignee",
  "notificationMessage": "mensagem de notificação para o humano"
}
\`\`\`
notifyTarget pode ser: "none", "specific_number", "deal_assignee"

---

## REGRA CRÍTICA — Fidelidade ao processo do cliente

O campo \`salesProcess\` do perfil do negócio descreve EXATAMENTE como o cliente vende hoje. Você DEVE:

1. **Mapear 1:1**: Cada etapa descrita no salesProcess DEVE virar um step. Não invente etapas que o cliente não mencionou. Não omita etapas que ele descreveu.
2. **Usar a linguagem do cliente**: Se o cliente disse "cotação", use "Cotação" no nome do step — não substitua por "Qualificação". Se disse "vistoria", use "Vistoria" — não troque por "Avaliação Técnica".
3. **keyQuestion personalizada**: A keyQuestion DEVE ser a pergunta REAL que o agente faria naquela etapa do funil DESTE negócio específico. NÃO use perguntas genéricas.

**Exemplos de keyQuestion genérica vs personalizada:**

| Negócio | Etapa | ERRADO (genérico) | CERTO (personalizado) |
|---------|-------|--------------------|-----------------------|
| Proteção veicular | Cotação | "Como posso te ajudar?" | "Pra eu montar sua cotação, me passa o modelo, ano e cidade do seu veículo?" |
| Clínica estética | Triagem | "Qual o motivo do contato?" | "Qual procedimento te interessou? Botox, preenchimento ou harmonização?" |
| Escola | Qualificação | "Pode me contar mais?" | "Pra qual série e turno você está buscando vaga?" |
| Imobiliária | Sondagem | "O que você precisa?" | "Você tá buscando pra compra ou aluguel? Quantos quartos precisa?" |

---

## Regras obrigatórias

1. **Quantidade**: Gere entre 3 e 5 steps.
2. **Sequência**: Os orders devem ser sequenciais: 0, 1, 2, ...
3. **Mínimo 1 ação por step**: Cada step deve ter pelo menos 1 action.
4. **targetStagePosition**: DEVE referenciar um position existente nos stages que você recebeu. Não invente positions.
5. **Último step DEVE incluir**:
   - Uma action \`hand_off_to_human\` (safety net para casos que o agente não sabe resolver)
   - Uma action \`create_task\` (follow-up se o lead parar de responder)
6. **Progressão lógica**: Cada step deve avançar o funil usando \`move_deal\` quando o lead evolui.

---

## Exemplo 1 — Proteção Veicular

**Input (perfil):**
- Empresa: Álamo Benefícios — associação de proteção veicular
- Processo: "O cliente chega querendo saber sobre proteção. A gente pega os dados do veículo, faz a cotação, apresenta os adicionais como assistência 24h e telemedicina, coleta a documentação e fecha com assinatura digital + vistoria."
- Público: proprietários de veículos buscando proteção acessível

**Input (stages):**
\`\`\`json
[
  { "name": "Novo Contato", "position": 0, "color": "#6366f1" },
  { "name": "Cotação Enviada", "position": 1, "color": "#8b5cf6" },
  { "name": "Apresentação de Adicionais", "position": 2, "color": "#f59e0b" },
  { "name": "Documentação", "position": 3, "color": "#f97316" },
  { "name": "Assinatura e Vistoria", "position": 4, "color": "#22c55e" }
]
\`\`\`

**Output esperado:**
\`\`\`json
{
  "steps": [
    {
      "name": "Abertura e Dados do Veículo",
      "objective": "Recepcione o cliente, descubra o interesse em proteção veicular e colete os dados do veículo para montar a cotação: modelo, ano, cidade e tipo de uso.",
      "keyQuestion": "Oi! Que bom que você se interessou pela proteção da Álamo! Pra eu montar sua cotação, me passa o modelo, ano e cidade do seu veículo?",
      "messageTemplate": null,
      "order": 0,
      "actions": [
        {
          "type": "update_deal",
          "trigger": "Ao identificar o modelo e ano do veículo",
          "allowedFields": ["title", "notes"],
          "allowedStatuses": []
        },
        {
          "type": "update_contact",
          "trigger": "Ao coletar nome e dados do cliente"
        }
      ]
    },
    {
      "name": "Cotação e Apresentação",
      "objective": "Com os dados do veículo, apresente a cotação da proteção. Destaque o custo-benefício comparado a seguradoras e apresente os adicionais (assistência 24h, telemedicina, clube de descontos).",
      "keyQuestion": null,
      "messageTemplate": "Pronto! Com base no seu veículo, a proteção completa fica a partir de [VALOR]. E o melhor: você já leva junto assistência 24h, telemedicina pra família toda e nosso clube de descontos. Quer que eu te explique melhor cada benefício?",
      "order": 1,
      "actions": [
        {
          "type": "update_deal",
          "trigger": "Ao registrar o valor da cotação",
          "allowedFields": ["value", "notes"],
          "allowedStatuses": []
        },
        {
          "type": "move_deal",
          "trigger": "Após enviar a cotação ao cliente",
          "targetStagePosition": 1
        }
      ]
    },
    {
      "name": "Coleta de Documentação",
      "objective": "Após o cliente aceitar a cotação, colete a documentação necessária: CNH, CRLV e comprovante de residência. Oriente sobre o envio das fotos.",
      "keyQuestion": "Que ótimo! Pra darmos andamento, preciso que você me envie foto da CNH, do CRLV do veículo e um comprovante de residência. Pode ser foto pelo celular mesmo!",
      "messageTemplate": null,
      "order": 2,
      "actions": [
        {
          "type": "update_deal",
          "trigger": "Ao registrar que o cliente aceitou e está enviando documentos",
          "allowedFields": ["notes"],
          "allowedStatuses": []
        },
        {
          "type": "move_deal",
          "trigger": "Ao confirmar que os documentos foram recebidos",
          "targetStagePosition": 3
        }
      ]
    },
    {
      "name": "Assinatura e Vistoria",
      "objective": "Envie o link de assinatura digital e agende a vistoria do veículo. Confirme a conclusão e transfira para atendimento humano se necessário.",
      "keyQuestion": null,
      "messageTemplate": "Documentação recebida! Agora é só assinar o contrato digital que vou te enviar e agendar a vistoria do veículo. Qual o melhor dia e horário pra vistoria?",
      "order": 3,
      "actions": [
        {
          "type": "list_availability",
          "trigger": "Ao buscar horários disponíveis para a vistoria",
          "daysAhead": 7,
          "slotDuration": 30,
          "startTime": "08:00",
          "endTime": "18:00"
        },
        {
          "type": "create_event",
          "trigger": "Ao confirmar o dia e horário da vistoria com o cliente",
          "titleInstructions": "Vistoria Veicular - Novo Associado",
          "duration": 30,
          "startTime": "08:00",
          "endTime": "18:00",
          "allowReschedule": true,
          "rescheduleInstructions": "Ofereça outros horários dentro da semana"
        },
        {
          "type": "move_deal",
          "trigger": "Após agendar a vistoria e enviar o contrato",
          "targetStagePosition": 4
        },
        {
          "type": "create_task",
          "trigger": "Se o cliente parar de responder após receber a cotação ou durante a documentação",
          "title": "Follow-up: Retomar cliente que parou no processo de adesão",
          "dueDaysOffset": 2
        },
        {
          "type": "hand_off_to_human",
          "trigger": "Se o cliente tiver dúvidas sobre cobertura específica, sinistro anterior ou solicitar atendimento humano",
          "notifyTarget": "deal_assignee",
          "notificationMessage": "Cliente em processo de adesão precisa de atendimento humano. Possível dúvida sobre cobertura ou exceção."
        }
      ]
    }
  ]
}
\`\`\`

---

## Exemplo 2 — Clínica de Estética

**Input (perfil):**
- Empresa: Clínica Bella — estética facial e corporal
- Processo: "A pessoa chega perguntando sobre um procedimento, a gente faz uma triagem pra entender o que ela quer, agenda a avaliação presencial com a doutora, e depois do procedimento faz acompanhamento."
- Público: mulheres 25-50 anos interessadas em estética

**Input (stages):**
\`\`\`json
[
  { "name": "Novo Contato", "position": 0, "color": "#6366f1" },
  { "name": "Triagem Realizada", "position": 1, "color": "#8b5cf6" },
  { "name": "Avaliação Agendada", "position": 2, "color": "#f59e0b" },
  { "name": "Procedimento Realizado", "position": 3, "color": "#22c55e" },
  { "name": "Acompanhamento", "position": 4, "color": "#14b8a6" }
]
\`\`\`

**Output esperado:**
\`\`\`json
{
  "steps": [
    {
      "name": "Recepção e Triagem",
      "objective": "Acolha a paciente, descubra qual procedimento a interessou e colete informações básicas para a triagem inicial.",
      "keyQuestion": "Oie! Bem-vinda à Clínica Bella! Qual procedimento te interessou? Temos botox, preenchimento, harmonização facial e depilação a laser.",
      "messageTemplate": null,
      "order": 0,
      "actions": [
        {
          "type": "update_deal",
          "trigger": "Ao identificar o procedimento de interesse e o nome da paciente",
          "allowedFields": ["title", "notes"],
          "allowedStatuses": []
        },
        {
          "type": "move_deal",
          "trigger": "Após identificar o procedimento de interesse e coletar informações básicas",
          "targetStagePosition": 1
        }
      ]
    },
    {
      "name": "Agendamento da Avaliação",
      "objective": "Convide a paciente para uma avaliação presencial com a doutora. Informe que valores e plano de tratamento são definidos na avaliação. Ofereça horários disponíveis.",
      "keyQuestion": null,
      "messageTemplate": "Pra te dar o melhor resultado, a doutora precisa avaliar pessoalmente. A avaliação é rápida e sem compromisso! Qual o melhor dia e horário pra você?",
      "order": 1,
      "actions": [
        {
          "type": "list_availability",
          "trigger": "Ao buscar horários disponíveis para a avaliação",
          "daysAhead": 7,
          "slotDuration": 30,
          "startTime": "09:00",
          "endTime": "18:00"
        },
        {
          "type": "create_event",
          "trigger": "Ao confirmar dia e horário da avaliação com a paciente",
          "titleInstructions": "Avaliação Estética - Nova Paciente",
          "duration": 30,
          "startTime": "09:00",
          "endTime": "18:00",
          "allowReschedule": true,
          "rescheduleInstructions": "Ofereça outros horários da semana com flexibilidade"
        },
        {
          "type": "move_deal",
          "trigger": "Após confirmar o agendamento da avaliação",
          "targetStagePosition": 2
        }
      ]
    },
    {
      "name": "Confirmação e Acompanhamento",
      "objective": "Confirme o agendamento, oriente sobre preparos necessários e crie follow-ups. Transfira para atendimento humano em caso de urgências ou dúvidas médicas.",
      "keyQuestion": null,
      "messageTemplate": "Sua avaliação está confirmada! Chega uns 10 minutinhos antes pra gente fazer sua fichinha. Se tiver qualquer dúvida até lá, é só chamar!",
      "order": 2,
      "actions": [
        {
          "type": "create_task",
          "trigger": "Se a paciente parar de responder ou não confirmar o agendamento",
          "title": "Follow-up: Confirmar avaliação estética com paciente",
          "dueDaysOffset": 1
        },
        {
          "type": "hand_off_to_human",
          "trigger": "Se a paciente relatar reação alérgica, efeito colateral, ou fizer perguntas médicas que fogem do escopo do agente",
          "notifyTarget": "deal_assignee",
          "notificationMessage": "Paciente com dúvida médica ou situação que requer atenção profissional. Avaliar prioridade."
        }
      ]
    }
  ]
}
\`\`\`

---

## Instruções finais

- Adapte ao negócio REAL que você recebeu — NÃO copie os exemplos.
- Os steps DEVEM refletir EXATAMENTE o processo de vendas que o cliente descreveu.
- As keyQuestion DEVEM ser personalizadas ao produto/serviço/público do cliente.
- Os targetStagePosition DEVEM ser positions existentes nos stages fornecidos como input.
- Retorne o JSON resultante no formato especificado.
`
