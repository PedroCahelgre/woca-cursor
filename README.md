# WOCA Clone (Cursor Starter)

Base para clone do WOCA com:
- React + TypeScript + Vite
- Tailwind CSS
- Fabric.js (editor gráfico)
- A* para roteamento de eletroduto evitando paredes
- Exportação de planta em PDF e materiais em JSON

## Rodar localmente

```bash
npm install
npm run dev
```

## Funcionalidades já prontas

- Grid estilo CAD (passo de 10 cm, equivalente lógico)
- Ferramentas de inserção: `Tomada`, `Interruptor`, `Lâmpada`
- Ferramenta `Parede` com propriedade de obstáculo
- Seleção de dois pontos elétricos e conexão automática via A*
- Exportação do canvas para `planta-eletrica.pdf`
- Exportação da lista de materiais para `lista-materiais.json`

## Estrutura de fases (seu roteiro)

1. **Fase 1 (Setup)**: editor com canvas e grid.
2. **Fase 2 (Símbolos)**: barra lateral e símbolos em objetos vetoriais.
3. **Fase 3 (Paredes)**: linhas com marcação de obstáculo.
4. **Fase 4 (Conexões)**: algoritmo A* para desviar das paredes.
5. **Fase 5 (Exportação)**: PDF + JSON de materiais.

## Próximos passos recomendados

- Substituir símbolos provisórios por conversão real de `.dxf` do repositório `gutierrezps/simbolos-nbr-5444`
- Implementar snap avançado e pan/zoom contínuo estilo CAD
- Criar classe `ElectricalCalculator` com regras NBR 5410
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
