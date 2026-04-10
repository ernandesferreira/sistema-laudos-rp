# Visual Guide - Sistema de Laudos RP

## Direcao visual

- Estilo: dark premium com atmosfera investigativa e organizacional.
- Emoção: credibilidade sem linguagem institucional oficial.
- Contraste: superfices grafite, texto claro, acentos em azul tecnico e ambar de alerta.
- Forma: cards com borda suave e brilho discreto.

## Componentes principais

- Shell administrativo: sidebar + topbar + area de conteudo.
- Sidebar: marca, navegacao principal e destaque de rota ativa.
- Topbar: contexto da area, data/hora, acesso rapido ao branding.
- Cards: estatisticas, resumo, blocos de formulario e tabelas.
- Tabelas: cabecalho claro, linhas com hover e status em badge.
- Formularios: campos com fundo escuro, labels legiveis e foco azul.

## Design tokens recomendados

- Base: app #07090d, surface #0f131a, surface-2 #141a23.
- Linhas: line #252f40, line-strong #334155.
- Texto: ink #e6ecf3, secundario em slate-400/slate-300.
- Acento principal: brand-600 #3a82ff.
- Acento auxiliar: warn-700 #f2c169.
- Estados:
  - sucesso: emerald em camada translucida
  - alerta: amber em camada translucida
  - perigo: rose em camada translucida

## Regras de usabilidade

- Mobile-first: grids quebram para coluna unica, sem overflow em formulario.
- Toque: botoes com altura confortavel e espacamento de 8-12px.
- Legibilidade: minimo 14px em corpo, labels consistentes, contraste alto.
- Tabelas: informacao essencial visivel no mobile, detalhes em colunas progressivas.

## Branding editavel

- Nome e logo configuraveis em /settings/branding.
- Persistencia atual: localStorage para preparacao de produto sem provedor externo.
- Exibicao: identidade refletida no sidebar e topbar.
