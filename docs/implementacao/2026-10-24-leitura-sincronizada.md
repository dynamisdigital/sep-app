# Cobertura do texto na leitura sincronizada — 24/10/2026

O destaque podia deixar as últimas letras e a pontuação sem cobertura: a estimativa terminava em 98,5% do trecho, e a faixa visual era encerrada no meio da palavra. A correspondência proporcional entre texto falado e visível também deslocava os finais de frases quando valores, siglas e ordinais tinham outra extensão na narração.

A correção no leitor compartilhado completa a palavra atual com sua pontuação, permite chegar a 100% do trecho e impede que a cobertura recue entre um evento da voz e o quadro visual seguinte. A posição de pausa continua sendo registrada separadamente: o recuo de 2 segundos ao retomar permanece funcionando. Os limites das frases agora se apoiam na pontuação do texto visível, preservando a posição mesmo com valores e siglas expandidos na fala.

Auditoria: o mecanismo de marcação por caractere (`sep-lido`, CSS Highlights e tarja) é compartilhado pelos 21 artigos do blog. O narrador dos tours não aplica destaque por caractere ao texto; seu cursor aponta controles da interface, sem este mecanismo de cobertura.

Validação: 26 testes unitários aprovados e 27 testes de navegador com voz simulada. Foram verificados os finais dos trechos de todos os artigos e reproduzido o exemplo “banner da jornada.” em 1, 2 e 3 colunas nos temas claro e escuro, incluindo captura visual. A frase fica inteiramente coberta, sem incluir o “O” da frase seguinte. Compilação aprovada, com bundle inicial de 749,94 kB.
