(function(window) {
    window.PBC_CREATE_ACADEMIC_CORE = function(deps = {}) {
        const normalizeSearchText = deps.normalizeSearchText || ((value) => String(value || '').toLowerCase().trim());
        const onlyDigits = deps.onlyDigits || ((value) => String(value || '').replace(/\D/g, ''));

        const ACADEMIC_GRADES_SHEET_ID = '1bYrom6x6JTehCU-t_p_4fA32WKF-1uob';
        const ACADEMIC_GRADES_CSV_URL = `https://docs.google.com/spreadsheets/d/${ACADEMIC_GRADES_SHEET_ID}/gviz/tq?tqx=out:csv`;
        const ACADEMIC_GRADE_SUBJECTS = [
            { id: 'rh', title: 'Relações Humanas', icon: 'fas fa-users', keys: ['notaderelacoeshumanas', 'relacoeshumanas'] },
            { id: 'legislacao', title: 'Legislação', icon: 'fas fa-gavel', keys: ['notadelegislacao', 'legislacao'] },
            { id: 'salvamento', title: 'Salvamento', icon: 'fas fa-life-ring', keys: ['notadesalvamento', 'salvamento'] },
            { id: 'pci', title: 'Prevenção e Combate a Incêndio', icon: 'fas fa-fire-extinguisher', keys: ['notadeprevencaoecombateaincendio', 'prevencaoecombateaincendio', 'prevencao'] },
            { id: 'aph', title: 'Atendimento Pré Hospitalar', icon: 'fas fa-briefcase-medical', keys: ['notadeatendimentoprehospitalar', 'atendimentoprehospitalar', 'aph'] }
        ];
        
        function normalizeAcademicHeader(value) {
            return normalizeSearchText(value).replace(/[^a-z0-9]/g, '');
        }
        
        function normalizeAcademicName(value) {
            return normalizeSearchText(value).replace(/\s+/g, ' ');
        }
        
        function normalizeAcademicCompany(value) {
            const normalized = String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toUpperCase();
            const classMatch = normalized.match(/(?:^|[^A-Z0-9])B[\s_-]*0*(\d{1,3})(?:[^A-Z0-9]|$)/);
            if (classMatch) return `B${String(Number(classMatch[1])).padStart(2, '0')}`;
            return normalized.replace(/[^A-Z0-9]/g, '');
        }
        
        function inferAcademicCompanyFromFileName(fileName = '') {
            const normalized = String(fileName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const match = normalized.match(/(?:^|[^A-Z0-9])B[\s_-]*0*(\d{1,3})(?:[^A-Z0-9]|$)/i);
            if (!match) return '';
            return `B${String(Number(match[1])).padStart(2, '0')}`;
        }
        
        function getAcademicRowLabel(row) {
            return normalizeAcademicHeader((row || []).slice(0, 4).find(cell => String(cell || '').trim()) || '');
        }
        
        function parseTransposedAcademicRows(rows) {
            const normalizedRows = rows || [];
            const findRow = (keys) => normalizedRows.find(item => {
                const label = getAcademicRowLabel(item);
                return keys.some(key => label.includes(normalizeAcademicHeader(key)));
            }) || [];
        
            const nameRow = findRow(['nome']);
            const phoneRow = findRow(['telefone']);
            const cpfRow = findRow(['cpf']);
            const hasLabeledStudentRows = nameRow.length > 1;
        
            if (hasLabeledStudentRows) {
                const emailRow = findRow(['email']);
                const motherRow = findRow(['nome da mae', 'mae']);
                const fatherRow = findRow(['nome do pai', 'pai']);
                const rgRow = findRow(['rg']);
                const rhRow = findRow(['nota relacoes']);
                const legislationRow = findRow(['nota legislacao']);
                const rescueRow = findRow(['nota salvamento']);
                const fireRow = findRow(['nota prevencao']);
                const aphRow = findRow(['nota atendimento']);
                const averageRow = findRow(['media final']);
                const situationRow = findRow(['situacao']);
                const companyRow = findRow(['turma', 'empresa']);
                const maxColumns = Math.max(...normalizedRows.map(item => item.length));
                const records = [];
        
                for (let col = 1; col < maxColumns; col++) {
                    const name = String(nameRow[col] || '').replace(/\s+/g, ' ').trim();
                    const phone = String(phoneRow[col] || '').trim();
                    const cpf = String(cpfRow[col] || '').trim();
                    const email = String(emailRow[col] || '').trim();
                    const hasIdentity = onlyDigits(cpf).length >= 11 || onlyDigits(phone).length >= 8 || email.includes('@');
                    const hasAcademicData = [rhRow, legislationRow, rescueRow, fireRow, aphRow, averageRow, situationRow]
                        .some(row => String(row[col] ?? '').trim());
        
                    if (!name || normalizeAcademicHeader(name) === 'nome' || (!hasIdentity && !hasAcademicData)) continue;
        
                    const average = averageRow[col] || '';
                    const averageNumber = Number(String(average).replace(',', '.').replace(/[^\d.]/g, ''));
                    const derivedSituation = situationRow[col] || (!Number.isNaN(averageNumber) && average ? (averageNumber >= 7 ? 'Aprovado' : 'Recuperação') : '');
        
                    records.push({
                        nome: name,
                        telefone: phone,
                        cpf,
                        rg: rgRow[col] || '',
                        email,
                        nomedamae: motherRow[col] || '',
                        nomedopai: fatherRow[col] || '',
                        notaderelacoeshumanas: rhRow[col] || '',
                        notadelegislacao: legislationRow[col] || '',
                        notadesalvamento: rescueRow[col] || '',
                        notadeprevencaoecombateaincendio: fireRow[col] || '',
                        notadeatendimentoprehospitalar: aphRow[col] || '',
                        mediafinal: average,
                        situacao: derivedSituation,
                        turma: companyRow[col] || ''
                    });
                }
        
                if (records.length) return records;
            }
        
            const identityRow = normalizedRows
                .map((row, index) => ({
                    row,
                    index,
                    score: row.filter(cell => {
                        const value = String(cell || '');
                        return /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(value) || /\(?\d{2}\)?\s?9?\s?\d{4,5}-?\d{4}/.test(value);
                    }).length
                }))
                .sort((a, b) => b.score - a.score)[0];
        
            const hasGradeRows = normalizedRows.some(row => {
                const label = getAcademicRowLabel(row);
                return label.includes('notarelacoes') || label.includes('notalegislacao') || label.includes('mediafinal');
            });
        
            if (!identityRow || identityRow.score < 2 || !hasGradeRows) return [];
        
            const emailRow = findRow(['email']);
            const motherRow = findRow(['nome da mae', 'mae']);
            const fatherRow = findRow(['nome do pai', 'pai']);
            const rhRow = findRow(['nota relacoes']);
            const legislationRow = findRow(['nota legislacao']);
            const rescueRow = findRow(['nota salvamento']);
            const fireRow = findRow(['nota prevencao']);
            const aphRow = findRow(['nota atendimento']);
            const averageRow = findRow(['media final']);
            const situationRow = findRow(['situacao']);
            const companyRow = findRow(['turma', 'empresa']);
            const maxColumns = Math.max(...normalizedRows.map(item => item.length));
            const records = [];
        
            for (let col = 0; col < maxColumns; col++) {
                const identity = String(identityRow.row?.[col] || '').trim();
                const cpfMatch = identity.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
                const phoneMatch = identity.match(/\(?\d{2}\)?\s?9?\s?\d{4,5}-?\d{4}/);
                const cpf = cpfMatch ? cpfMatch[0] : '';
                const phone = phoneMatch ? phoneMatch[0] : '';
                const name = identity
                    .replace(cpf, '')
                    .replace(phone, '')
                    .replace(/nome|telefone|cpf/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
        
                if (!name || (!cpf && !phone)) continue;
        
                const average = averageRow[col] || '';
                const averageNumber = Number(String(average).replace(',', '.').replace(/[^\d.]/g, ''));
                const derivedSituation = situationRow[col] || (!Number.isNaN(averageNumber) && average ? (averageNumber >= 7 ? 'Aprovado' : 'Recuperação') : '');
        
                records.push({
                    nome: name,
                    telefone: phone,
                    cpf,
                    email: emailRow[col] || '',
                    nomedamae: motherRow[col] || '',
                    nomedopai: fatherRow[col] || '',
                    notaderelacoeshumanas: rhRow[col] || '',
                    notadelegislacao: legislationRow[col] || '',
                    notadesalvamento: rescueRow[col] || '',
                    notadeprevencaoecombateaincendio: fireRow[col] || '',
                    notadeatendimentoprehospitalar: aphRow[col] || '',
                    mediafinal: average,
                    situacao: derivedSituation,
                    turma: companyRow[col] || ''
                });
            }
        
            return records;
        }
        
        function parseVerticalAcademicRows(rows) {
            const headerIndex = (rows || []).findIndex(row => {
                const headers = row.map(normalizeAcademicHeader);
                const hasName = headers.some(header => ['nome', 'nomecompleto'].includes(header));
                const hasContact = headers.some(header => ['cpf', 'telefone', 'email'].includes(header));
                const hasAcademic = headers.some(header => header.includes('nota') || header.includes('media') || header.includes('situacao'));
                return hasName && hasContact && hasAcademic;
            });
        
            if (headerIndex < 0) return [];
        
            const headers = rows[headerIndex].map(normalizeAcademicHeader);
            return rows
                .slice(headerIndex + 1)
                .filter(cells => cells.some(cell => String(cell || '').trim()))
                .map(cells => headers.reduce((acc, header, index) => {
                    if (header) acc[header] = cells[index] || '';
                    return acc;
                }, {}))
                .filter(row => getAcademicCell(row, ['nome', 'nomecompleto', 'cpf', 'telefone', 'email']));
        }
        
        function parseAcademicGridRows(rows) {
            const cleanedRows = (rows || []).filter(row => Array.isArray(row) && row.some(cell => String(cell || '').trim()));
            if (!cleanedRows.length) return [];
            const transposed = parseTransposedAcademicRows(cleanedRows);
            if (transposed.length) return transposed;
            return parseVerticalAcademicRows(cleanedRows);
        }
        
        function parseAcademicCsv(csvText) {
            const rows = [];
            let row = [];
            let field = '';
            let quoted = false;
        
            for (let i = 0; i < csvText.length; i++) {
                const char = csvText[i];
                if (quoted) {
                    if (char === '"' && csvText[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else if (char === '"') {
                        quoted = false;
                    } else {
                        field += char;
                    }
                } else if (char === '"') {
                    quoted = true;
                } else if (char === ',') {
                    row.push(field.trim());
                    field = '';
                } else if (char === '\n') {
                    row.push(field.trim());
                    rows.push(row);
                    row = [];
                    field = '';
                } else if (char !== '\r') {
                    field += char;
                }
            }
        
            row.push(field.trim());
            if (row.some(Boolean)) rows.push(row);
            if (!rows.length) return [];
            return parseAcademicGridRows(rows);
        }
        
        function getAcademicCell(row, keys) {
            for (const key of keys) {
                const normalized = normalizeAcademicHeader(key);
                if (row[normalized] !== undefined && row[normalized] !== '') return row[normalized];
            }
            return '';
        }
        
        function parseAcademicGradeValue(value) {
            const normalized = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '');
            if (!normalized) return null;
            const number = Number(normalized);
            return Number.isFinite(number) ? number : null;
        }
        
        function calculateAcademicAverage(subjects = {}) {
            const values = ACADEMIC_GRADE_SUBJECTS
                .map(subject => subjects[subject.id])
                .map(parseAcademicGradeValue)
                .filter(value => value !== null);
            if (values.length !== ACADEMIC_GRADE_SUBJECTS.length) return '';
            const average = values.reduce((sum, value) => sum + value, 0) / values.length;
            return average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        }
        
        function buildAcademicRecordFromRow(row) {
            const subjects = {};
            ACADEMIC_GRADE_SUBJECTS.forEach(subject => {
                subjects[subject.id] = getAcademicCell(row, subject.keys);
            });
            const importedAverage = getAcademicCell(row, ['mediafinal', 'media', 'mediafinaldocurso', 'notafinal', 'resultadofinal', 'final']);
            return {
                name: getAcademicCell(row, ['nome', 'nomecompleto']),
                phone: getAcademicCell(row, ['telefone', 'celular', 'whatsapp']),
                cpf: getAcademicCell(row, ['cpf']),
                rg: getAcademicCell(row, ['rg']),
                email: getAcademicCell(row, ['email', 'e-mail']),
                motherName: getAcademicCell(row, ['nomedamae', 'mae']),
                fatherName: getAcademicCell(row, ['nomedopai', 'pai']),
                company: getAcademicCell(row, ['turma', 'empresa', 'company']),
                subjects,
                average: importedAverage || calculateAcademicAverage(subjects),
                situation: getAcademicCell(row, ['situacao', 'status']),
                source: 'Planilha oficial de notas'
            };
        }
        
        function getAcademicRecordSignature(record) {
            return {
                cpf: onlyDigits(record?.cpf),
                phone: onlyDigits(record?.phone),
                email: normalizeSearchText(record?.email),
                name: normalizeAcademicName(record?.name)
            };
        }
        
        function getNameTokens(value) {
            const ignored = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
            return normalizeSearchText(value)
                .split(/\s+/)
                .map(item => item.trim())
                .filter(item => item.length >= 3 && !ignored.has(item));
        }
        
        function namesLikelyMatch(sheetName, userName) {
            const sheet = normalizeSearchText(sheetName);
            const user = normalizeSearchText(userName);
            if (!sheet || !user) return false;
            if ((sheet.length >= 8 && user.includes(sheet)) || (user.length >= 8 && sheet.includes(user))) return true;
        
            const sheetTokens = getNameTokens(sheetName);
            const userTokens = getNameTokens(userName);
            if (!sheetTokens.length || !userTokens.length) return false;
            const common = userTokens.filter(token => sheetTokens.includes(token));
            const hasFirstName = common.includes(sheetTokens[0]) || common.includes(userTokens[0]);
            return hasFirstName && common.length >= Math.min(2, userTokens.length);
        }
        
        function getAcademicNameCandidates(recordName, users) {
            const normalizedRecordName = normalizeAcademicName(recordName);
            if (!normalizedRecordName) return [];
        
            const exactMatches = users.filter(user => normalizeAcademicName(user.data?.name) === normalizedRecordName);
            if (exactMatches.length) return exactMatches.map(user => ({ ...user, matchedBy: 'Nome' }));
        
            const likelyMatches = users.filter(user => namesLikelyMatch(recordName, user.data?.name));
            return likelyMatches.map(user => ({ ...user, matchedBy: 'Nome parcial' }));
        }
        
        function findMatchingUserForAcademicRecord(record, users) {
            const signature = getAcademicRecordSignature(record);
            const recordCompany = normalizeAcademicCompany(record?.company);
            const eligibleUsers = recordCompany
                ? users.filter(user => normalizeAcademicCompany(user.data?.company) === recordCompany)
                : users;
            if (recordCompany && !eligibleUsers.length) return null;
            if (signature.cpf) {
                const byCpf = eligibleUsers.find(user => onlyDigits(user.data?.cpf) === signature.cpf);
                if (byCpf) return { ...byCpf, matchedBy: 'CPF' };
            }
            if (signature.phone) {
                const phoneTail = signature.phone.slice(-9);
                const byPhone = eligibleUsers.find(user => {
                    const candidate = onlyDigits(user.data?.phone);
                    return candidate && candidate.slice(-9) === phoneTail;
                });
                if (byPhone) return { ...byPhone, matchedBy: 'Telefone' };
            }
            if (signature.email) {
                const byEmail = eligibleUsers.find(user => normalizeSearchText(user.data?.email) === signature.email);
                if (byEmail) return { ...byEmail, matchedBy: 'E-mail' };
            }
            if (signature.name) {
                const nameCandidates = getAcademicNameCandidates(record?.name, eligibleUsers);
                if (nameCandidates.length === 1) return nameCandidates[0];
                if (nameCandidates.length > 1) {
                    return {
                        ambiguous: true,
                        matchedBy: 'Nome ambíguo',
                        recordName: record?.name || '',
                        recordCompany: record?.company || '',
                        candidates: nameCandidates.map(candidate => ({
                            uid: candidate.uid,
                            name: candidate.data?.name || '',
                            email: candidate.data?.email || '',
                            cpf: candidate.data?.cpf || '',
                            company: candidate.data?.company || ''
                        }))
                    };
                }
            }
            return null;
        }
        
        async function fetchAcademicRecordsFromSheet() {
            const response = await fetch(`${ACADEMIC_GRADES_CSV_URL}&cacheBust=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Não foi possível ler a planilha.');
            const csvText = await response.text();
            return parseAcademicCsv(csvText).map(buildAcademicRecordFromRow);
        }
        
        async function readAcademicRecordsFromFile(file) {
            const extension = String(file?.name || '').split('.').pop().toLowerCase();
            if (!file) throw new Error('Nenhum arquivo selecionado.');
            const inferredCompany = inferAcademicCompanyFromFileName(file.name);
            const enrichRecord = record => ({
                ...record,
                company: record.company || inferredCompany,
                sourceFile: file.name || 'Planilha sem nome'
            });
        
            if (extension === 'csv') {
                const csvText = await file.text();
                const csvRecords = parseAcademicCsv(csvText).map(buildAcademicRecordFromRow).map(enrichRecord);
                csvRecords.sheetName = 'CSV';
                csvRecords.inferredCompany = inferredCompany;
                return csvRecords;
            }
        
            if (['xlsx', 'xls'].includes(extension)) {
                if (!window.XLSX) {
                    throw new Error('Leitor de Excel ainda não carregou. Atualize a página e tente novamente.');
                }
                const buffer = await file.arrayBuffer();
                const workbook = window.XLSX.read(buffer, { type: 'array' });
                if (!workbook.SheetNames.length) throw new Error('A planilha não possui abas.');
                const scannedSheets = [];
                const allRecords = [];
                const usedSheets = [];
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });
                    const parsedRows = parseAcademicGridRows(rows);
                    scannedSheets.push(`${sheetName}: ${parsedRows.length}`);
                    if (parsedRows.length) {
                        usedSheets.push(sheetName);
                        allRecords.push(...parsedRows.map(row => enrichRecord({
                            ...buildAcademicRecordFromRow(row),
                            sheetName
                        })));
                    }
                }
                if (allRecords.length) {
                    allRecords.sheetName = usedSheets.join(', ');
                    allRecords.scannedSheets = scannedSheets;
                    allRecords.inferredCompany = inferredCompany;
                    return allRecords;
                }
                throw new Error(`Nenhum aluno foi encontrado nas abas da planilha. Abas verificadas: ${scannedSheets.join(' | ')}`);
            }
        
            throw new Error('Use um arquivo .xlsx, .xls ou .csv.');
        }

        return {
            ACADEMIC_GRADES_SHEET_ID,
            ACADEMIC_GRADES_CSV_URL,
            ACADEMIC_GRADE_SUBJECTS,
            normalizeAcademicHeader,
            normalizeAcademicName,
            normalizeAcademicCompany,
            inferAcademicCompanyFromFileName,
            getAcademicRowLabel,
            parseTransposedAcademicRows,
            parseVerticalAcademicRows,
            parseAcademicGridRows,
            parseAcademicCsv,
            getAcademicCell,
            parseAcademicGradeValue,
            calculateAcademicAverage,
            buildAcademicRecordFromRow,
            getAcademicRecordSignature,
            getNameTokens,
            namesLikelyMatch,
            getAcademicNameCandidates,
            findMatchingUserForAcademicRecord,
            fetchAcademicRecordsFromSheet,
            readAcademicRecordsFromFile
        };
    };
})(window);
