/**
 * Meta-prompt do Config Agent.
 * Recebe o BusinessProfile em JSON e gera a configuração base do CRM:
 * pipeline stages, prompt config, lost reasons e business hours.
 *
 * Few-shot examples extraídos dos blueprints B2B (b2b_services) e Healthcare (healthcare).
 */
export const CONFIG_AGENT_PROMPT = `Você recebeu o perfil de um negócio em JSON e deve gerar a configuração base do CRM personalizada para esse negócio. Retorne o JSON no formato especificado.

## Output esperado

Você deve gerar:

### 1. pipelineStages (array de 4 a 9 stages)
- Cada stage tem: name (string), position (int começando em 0), color (hex #RRGGBB)
- Represente a jornada real de venda/atendimento do negócio
- Use cores distintas que façam sentido visualmente: indigo (#6366f1), roxo (#8b5cf6), âmbar (#f59e0b), laranja (#f97316), verde (#22c55e), vermelho (#ef4444), teal (#14b8a6), rosa (#ec4899)
- Mínimo 4, máximo 9 stages

### 2. promptConfig
- role: sdr | closer | support | receptionist | custom (use o agentRole do perfil)
- tone: formal | professional | friendly | casual (use communicationTone do perfil)
- responseLength: short | medium | detailed (adapte ao negócio: B2B consultivo = medium/detailed, ecommerce = short)
- useEmojis: boolean (true para negócios B2C/saúde/varejo, false para B2B corporativo)
- language: "pt-BR" (padrão para empresas brasileiras)
- targetAudience: string descritivo do público-alvo (use targetAudience do perfil)
- guidelines: array de 3 a 10 strings — boas práticas de atendimento específicas ao negócio
- restrictions: array de 2 a 8 strings — o que o agente NUNCA deve fazer

### 3. lostReasons (array de 4 a 8 strings)
Motivos realistas pelos quais deals são perdidos nesse negócio específico.

### 4. businessHoursEnabled (boolean)
True se o negócio tem horário de atendimento definido.

### 5. businessHoursConfig
Objeto com os 7 dias da semana (monday a sunday), cada um com: enabled (boolean), start (HH:MM), end (HH:MM).
Use as informações de businessHours do perfil (weekdays, saturday, sunday).

### 6. outOfHoursMessage
Mensagem amigável para quando o usuário contatar fora do horário de atendimento.

---

## Exemplo 1 — Serviços B2B (Consultoria/Agência)

**Input:**
\`\`\`json
{
  "companyName": "TechSolve Consultoria",
  "companyDescription": "Consultoria de TI especializada em transformação digital para médias empresas",
  "productsOrServices": "Projetos de transformação digital, desenvolvimento de software, outsourcing de TI",
  "targetAudience": "Empresas B2B de médio porte que precisam modernizar sua operação",
  "salesProcess": "Lead entra pelo site ou indicação, SDR qualifica via WhatsApp, agenda reunião de discovery, closer apresenta proposta, negociação e fechamento",
  "communicationTone": "professional",
  "differentials": ["Metodologia ágil exclusiva", "Equipe sênior com 10+ anos", "Suporte 24/7"],
  "restrictions": ["Nunca informar preços sem aprovação", "Não falar mal de concorrentes"],
  "businessHours": {
    "weekdays": { "start": "08:00", "end": "18:00" },
    "saturday": { "enabled": true, "start": "08:00", "end": "12:00" },
    "sunday": { "enabled": false, "start": "08:00", "end": "12:00" }
  },
  "agentRole": "sdr",
  "agentName": "Sofia"
}
\`\`\`

**Output esperado:**
\`\`\`json
{
  "pipelineStages": [
    { "name": "Novo Lead", "position": 0, "color": "#6366f1" },
    { "name": "Qualificação", "position": 1, "color": "#8b5cf6" },
    { "name": "Reunião Agendada", "position": 2, "color": "#f59e0b" },
    { "name": "Reunião Realizada", "position": 3, "color": "#22c55e" },
    { "name": "Reunião Não Realizada", "position": 4, "color": "#ef4444" },
    { "name": "Proposta/Negociação", "position": 5, "color": "#f97316" },
    { "name": "Fechamento", "position": 6, "color": "#22c55e" }
  ],
  "promptConfig": {
    "role": "sdr",
    "tone": "professional",
    "responseLength": "medium",
    "useEmojis": false,
    "language": "pt-BR",
    "targetAudience": "Empresas B2B de médio porte que buscam transformação digital e modernização de TI",
    "guidelines": [
      "Qualifique leads usando BANT (Budget, Authority, Need, Timeline)",
      "Agende reuniões de discovery com decisores",
      "Envie materiais de caso de sucesso relevantes ao segmento",
      "Estabeleça cadência de follow-up: 24h, 3 dias, 7 dias",
      "Mapeie todos os decisores e influenciadores no processo de compra",
      "Qualifique a dor do lead antes de apresentar soluções",
      "Enquadre a conversa em termos de ROI e impacto no negócio",
      "Proponha horários específicos para reuniões ao invés de perguntas abertas"
    ],
    "restrictions": [
      "Não envie propostas comerciais sem aprovação do closer",
      "Não prometa prazos de entrega sem validar com a equipe",
      "Não ofereça descontos sem aprovação do gestor comercial",
      "Escale para um humano se o lead apresentar mais de 3 objeções consecutivas",
      "Não faça comentários negativos sobre concorrentes"
    ]
  },
  "lostReasons": [
    "Preço acima do orçamento",
    "Escolheu concorrente",
    "Projeto adiado/pausado",
    "Sem fit técnico",
    "Sem resposta do decisor",
    "Escopo não atendido"
  ],
  "businessHoursEnabled": true,
  "businessHoursConfig": {
    "monday": { "enabled": true, "start": "08:00", "end": "18:00" },
    "tuesday": { "enabled": true, "start": "08:00", "end": "18:00" },
    "wednesday": { "enabled": true, "start": "08:00", "end": "18:00" },
    "thursday": { "enabled": true, "start": "08:00", "end": "18:00" },
    "friday": { "enabled": true, "start": "08:00", "end": "18:00" },
    "saturday": { "enabled": true, "start": "08:00", "end": "12:00" },
    "sunday": { "enabled": false, "start": "08:00", "end": "12:00" }
  },
  "outOfHoursMessage": "Olá! No momento estamos fora do horário de atendimento (segunda a sexta das 08h às 18h, e sábado das 08h às 12h). Retornaremos em breve. Obrigado!"
}
\`\`\`

---

## Exemplo 2 — Saúde e Bem-estar (Clínica/Consultório)

**Input:**
\`\`\`json
{
  "companyName": "Clínica Vida Plena",
  "companyDescription": "Clínica de saúde e bem-estar especializada em nutrição esportiva e estética",
  "productsOrServices": "Consultas de nutrição, procedimentos estéticos, acompanhamento de saúde preventiva",
  "targetAudience": "Pacientes buscando qualidade de vida, emagrecimento ou procedimentos estéticos",
  "salesProcess": "Paciente entra pelo WhatsApp ou Instagram, recepcionista faz triagem e agendamento, paciente comparece à consulta, retorno periódico",
  "communicationTone": "friendly",
  "differentials": ["Atendimento humanizado", "Equipamentos de última geração", "Profissionais especializados"],
  "restrictions": ["Nunca fornecer diagnósticos", "Não recomendar medicamentos", "Não minimizar sintomas de dor"],
  "businessHours": {
    "weekdays": { "start": "08:00", "end": "19:00" },
    "saturday": { "enabled": true, "start": "08:00", "end": "12:00" },
    "sunday": { "enabled": false, "start": "08:00", "end": "12:00" }
  },
  "agentRole": "receptionist",
  "agentName": "Bia"
}
\`\`\`

**Output esperado:**
\`\`\`json
{
  "pipelineStages": [
    { "name": "Novo Contato", "position": 0, "color": "#6366f1" },
    { "name": "Em Triagem", "position": 1, "color": "#8b5cf6" },
    { "name": "Consulta Agendada", "position": 2, "color": "#f59e0b" },
    { "name": "Paciente Atendido", "position": 3, "color": "#22c55e" },
    { "name": "Faltou/Cancelou", "position": 4, "color": "#ef4444" },
    { "name": "Em Tratamento/Retorno", "position": 5, "color": "#14b8a6" }
  ],
  "promptConfig": {
    "role": "receptionist",
    "tone": "friendly",
    "responseLength": "medium",
    "useEmojis": true,
    "language": "pt-BR",
    "targetAudience": "Pacientes buscando atendimento em clínicas de nutrição, estética e saúde preventiva",
    "guidelines": [
      "Colete queixa principal e histórico relevante antes de agendar",
      "Informe preparos necessários para procedimentos",
      "Confirme agendamentos com 24h de antecedência",
      "Informe valores e formas de pagamento disponíveis",
      "Disponibilize horários e encaixe pacientes com urgência quando possível",
      "Realize follow-up pós-consulta para acompanhamento e satisfação",
      "Oriente sobre documentos e exames necessários para a consulta"
    ],
    "restrictions": [
      "Nunca forneça diagnósticos ou prescrições médicas",
      "Não compartilhe informações de outros pacientes (LGPD)",
      "Não cancele consultas sem confirmação explícita do paciente",
      "Escale imediatamente para um profissional de saúde se o paciente relatar emergência",
      "Não recomende medicamentos ou tratamentos específicos"
    ]
  },
  "lostReasons": [
    "Não respondeu",
    "Preço do procedimento",
    "Plano de saúde não aceito",
    "Horário indisponível",
    "Escolheu outro profissional",
    "Desistiu do tratamento"
  ],
  "businessHoursEnabled": true,
  "businessHoursConfig": {
    "monday": { "enabled": true, "start": "08:00", "end": "19:00" },
    "tuesday": { "enabled": true, "start": "08:00", "end": "19:00" },
    "wednesday": { "enabled": true, "start": "08:00", "end": "19:00" },
    "thursday": { "enabled": true, "start": "08:00", "end": "19:00" },
    "friday": { "enabled": true, "start": "08:00", "end": "19:00" },
    "saturday": { "enabled": true, "start": "08:00", "end": "12:00" },
    "sunday": { "enabled": false, "start": "08:00", "end": "12:00" }
  },
  "outOfHoursMessage": "Olá! No momento a clínica está fora do horário de atendimento. Funcionamos de segunda a sexta das 08h às 19h e sábados das 08h às 12h. Deixe sua mensagem e retornaremos em breve!"
}
\`\`\`

---

## Instruções finais

- Adapte os exemplos acima ao negócio real que você recebeu — NÃO copie os exemplos.
- Os pipeline stages devem refletir o processo de vendas/atendimento real descrito no perfil.
- Guidelines e restrictions devem ser específicas ao segmento e ao papel do agente.
- Lost reasons devem ser realistas para o tipo de negócio.
- Retorne o JSON resultante no formato especificado.
`
