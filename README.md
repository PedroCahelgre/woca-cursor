# WOCA Clone (Cursor Starter)

Base para clone do WOCA com:
- React + TypeScript + Vite
- Tailwind CSS
- Fabric.js (editor gráfico)
- A* para roteamento de eletroduto evitando paredes
- Pan/zoom e grid magnética (snap)
- Paleta com arrastar e soltar
- Calculadora elétrica NBR 5410 (base)
- Exportação de planta em PDF e materiais em JSON
- Salvamento e abertura de projeto em JSON
- Circuito ativo por símbolo e quadro de cargas em JSON

## Rodar localmente

```bash
npm install
npm run dev
```

## Funcionalidades já prontas

- Grid estilo CAD (passo de 10 cm, equivalente lógico)
- Ferramentas de inserção: `Tomada`, `Interruptor`, `Lâmpada` (clique e drag-drop)
- Ferramenta `Parede` com propriedade de obstáculo
- Seleção de dois pontos elétricos e conexão automática via A*
- Pan com `Alt + arrastar` e zoom no scroll do mouse
- Snap de objetos na malha durante movimentação
- Painel de cálculo para corrente, bitola, disjuntor e queda de tensão
- Rótulo automático na rota com bitola/disjuntor e comprimento do trecho
- Exportação do canvas para `planta-eletrica.pdf`
- Exportação da lista de materiais para `lista-materiais.json`
- Salvamento/carregamento do projeto (`woca-projeto.json`)
- Exportação do quadro de cargas (`quadro-cargas.json`)

## Estrutura de fases (seu roteiro)

1. **Fase 1 (Setup)**: editor com canvas e grid.
2. **Fase 2 (Símbolos)**: barra lateral e símbolos em objetos vetoriais.
3. **Fase 3 (Paredes)**: linhas com marcação de obstáculo.
4. **Fase 4 (Conexões)**: algoritmo A* para desviar das paredes.
5. **Fase 5 (Exportação)**: PDF + JSON de materiais.

## Próximos passos recomendados

- Substituir símbolos provisórios por conversão real de `.dxf` do repositório `gutierrezps/simbolos-nbr-5444`
- Importar símbolos reais em SVG convertidos dos `.dxf` do NBR 5444
- Ajustar tabela completa de capacidade de condução NBR 5410 por método/temperatura
- Adicionar testes unitários para A* e cálculo elétrico

## Deploy no Vercel

1. Suba o projeto no GitHub.
2. No Vercel, clique em **Add New Project** e selecione o repositório.
3. Framework: `Vite` (detecção automática).
4. Build command: `npm run build`
5. Output directory: `dist`

Também é possível usar CLI:

```bash
npm i -g vercel
vercel
```
