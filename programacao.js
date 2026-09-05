// programacao.js
// Regra: dado o volume total a entregar no dia e a capacidade de cada caminhão,
// calcula quantas viagens são necessárias e quantos caminhões isso exige,
// considerando que cada caminhão consegue de 3 a 4 entregas por dia.

function calcularProgramacao({
  volumeTotal,
  capacidadeCaminhao = 8,     // m³ por viagem (betoneira padrão)
  caminhoesDisponiveis = null,
  entregasMin = 3,
  entregasMax = 4
}) {
  if (!volumeTotal || volumeTotal <= 0) {
    throw new Error("Informe o volume total do dia (m³).");
  }
  if (!capacidadeCaminhao || capacidadeCaminhao <= 0) {
    throw new Error("Informe a capacidade do caminhão (m³).");
  }

  // 1) Quantas viagens (cargas de betoneira) o volume do dia exige
  const viagensNecessarias = Math.ceil(volumeTotal / capacidadeCaminhao);

  // 2) Faixa de caminhões necessários:
  //    melhor caso -> cada caminhão faz o máximo de entregas (4)
  //    pior caso   -> cada caminhão faz o mínimo de entregas (3)
  const caminhoesMinimo = Math.ceil(viagensNecessarias / entregasMax);
  const caminhoesMaximo = Math.ceil(viagensNecessarias / entregasMin);

  const resultado = {
    volumeTotal,
    capacidadeCaminhao,
    viagensNecessarias,
    caminhoesRecomendados: { minimo: caminhoesMinimo, maximo: caminhoesMaximo },
    entregasPorCaminhao: { min: entregasMin, max: entregasMax }
  };

  // 3) Se a frota disponível hoje foi informada, avalia se dá conta e monta o rateio
  if (caminhoesDisponiveis) {
    const viagensPorCaminhao = Math.ceil(viagensNecessarias / caminhoesDisponiveis);
    const status = viagensPorCaminhao <= entregasMax ? "dentro_da_capacidade" : "sobrecarregado";

    const base = Math.floor(viagensNecessarias / caminhoesDisponiveis);
    const resto = viagensNecessarias % caminhoesDisponiveis;
    const distribuicao = Array.from({ length: caminhoesDisponiveis }, (_, i) => {
      const viagens = base + (i < resto ? 1 : 0);
      return {
        caminhao: i + 1,
        viagens,
        volumeTransportado: viagens * capacidadeCaminhao
      };
    });

    resultado.frotaHoje = {
      caminhoesDisponiveis,
      viagensPorCaminhaoMedia: viagensPorCaminhao,
      status,
      caminhoesFaltando: status === "sobrecarregado" ? (caminhoesMinimo - caminhoesDisponiveis) : 0,
      distribuicao
    };
  }

  return resultado;
}

module.exports = { calcularProgramacao };
