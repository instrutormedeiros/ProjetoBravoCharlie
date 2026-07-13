(function(window) {
    window.PBC_OPERATIONAL_GLOSSARY_ITEMS = [
        { term: 'APH', icon: 'fa-kit-medical', tag: 'Atendimento', description: 'Atendimento Pré-Hospitalar. Primeiro atendimento prestado à vítima antes do encaminhamento ao serviço hospitalar.', example: 'Exemplo: avaliação primária, controle de hemorragia e suporte inicial até o resgate avançado.' },
        { term: 'PCI', icon: 'fa-fire-extinguisher', tag: 'Incêndio', description: 'Prevenção e Combate a Incêndio. Conjunto de ações para evitar, identificar e controlar princípios de incêndio.', example: 'Exemplo: escolha correta do extintor, abandono de área e acionamento da brigada.' },
        { term: 'EPI', icon: 'fa-helmet-safety', tag: 'Segurança', description: 'Equipamento de Proteção Individual usado para reduzir exposição a riscos durante atividades operacionais.', example: 'Exemplo: luvas, capacete, óculos, bota, máscara e vestimenta adequada.' },
        { term: 'EPR', icon: 'fa-lungs', tag: 'Proteção respiratória', description: 'Equipamento de Proteção Respiratória usado quando há risco respiratório, fumaça, gases ou deficiência de oxigênio.', example: 'Exemplo: máscara autônoma em ambiente com fumaça ou atmosfera perigosa.' },
        { term: 'RCP', icon: 'fa-heart-pulse', tag: 'Emergência clínica', description: 'Reanimação Cardiopulmonar. Manobra aplicada em vítima sem respiração normal e sem sinais de circulação.', example: 'Exemplo: compressões torácicas de qualidade até chegada do suporte avançado ou DEA.' },
        { term: 'POP', icon: 'fa-clipboard-list', tag: 'Procedimento', description: 'Procedimento Operacional Padrão. Roteiro claro para executar uma atividade com segurança e repetibilidade.', example: 'Exemplo: POP de abandono de área, inspeção de extintores ou atendimento inicial.' },
        { term: 'NR', icon: 'fa-scale-balanced', tag: 'Normas', description: 'Norma Regulamentadora. Regras de segurança e saúde do trabalho exigidas em atividades específicas.', example: 'Exemplo: NR 33 para espaço confinado e NR 35 para trabalho em altura.' },
        { term: 'Triagem', icon: 'fa-people-arrows', tag: 'APH', description: 'Processo de classificar vítimas por gravidade para priorizar atendimento em ocorrências com múltiplas vítimas.', example: 'Exemplo: identificar quem precisa de intervenção imediata antes dos casos leves.' },
        { term: 'Abandono de área', icon: 'fa-person-running', tag: 'Emergência', description: 'Saída organizada de pessoas de um local de risco por rotas seguras e pontos de encontro definidos.', example: 'Exemplo: evacuação após alarme de incêndio, vazamento ou ameaça estrutural.' },
        { term: 'Classe de incêndio', icon: 'fa-fire-flame-curved', tag: 'PCI', description: 'Classificação do tipo de combustível envolvido no incêndio para escolher a resposta correta.', example: 'Exemplo: classe A para sólidos, B para líquidos inflamáveis e C para equipamentos energizados.' }
    ];

    window.PBC_PREMIUM_LIBRARY_CATEGORIES = [
        { title: 'Apostilas em PDF', icon: 'fa-file-pdf', description: 'Materiais para estudo guiado, revisão e consulta antes das provas.', status: 'Em preparação' },
        { title: 'POPs operacionais', icon: 'fa-list-check', description: 'Roteiros de ação para abandono, inspeção, APH e princípios de incêndio.', status: 'Premium' },
        { title: 'Checklists práticos', icon: 'fa-square-check', description: 'Modelos para rotina, simulado, vistoria e organização de treinamentos.', status: 'Premium' },
        { title: 'Mapas mentais', icon: 'fa-diagram-project', description: 'Resumo visual dos pontos que mais caem em aula, simulado e avaliação.', status: 'Em expansão' },
        { title: 'Modelos profissionais', icon: 'fa-file-signature', description: 'Fichas, relatórios e documentos para usar na vida profissional.', status: 'Premium' },
        { title: 'Simulados extras', icon: 'fa-clipboard-question', description: 'Bancos de reforço para treinar antes de avaliações e entrevistas.', status: 'Em breve' }
    ];

    window.PBC_COURSE_HANDBOOK_DOWNLOADS = [
        {
            id: 'apostila-bc',
            courseType: 'BC',
            title: 'Apostila Bombeiro Civil e Brigadista',
            description: 'Material principal para acompanhar as aulas, revisar conteúdos e estudar antes das avaliações.',
            version: 'PDF oficial disponível',
            url: 'https://drive.google.com/uc?export=download&id=1V5CLfKNXrBLVR5eaWZu3LlR2Ii83JH1c',
            icon: 'fa-file-pdf'
        },
        {
            id: 'apostila-sp',
            courseType: 'SP',
            title: 'Apostila Segurança Patrimonial',
            description: 'Material de apoio para alunos da trilha de Segurança Patrimonial.',
            version: 'Aguardando PDF oficial',
            url: '',
            icon: 'fa-file-pdf'
        }
    ];
})(window);
