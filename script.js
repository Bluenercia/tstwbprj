let xColumn, yColumn, clusterColumn;
const outlier_color = "#ffffff"; 

const sentimentColorScale = d3
  .scaleLinear()
  .domain([-1, 0, 1])
  .range(["red", "yellow", "green"]);

function getSentimentColor(sentiment) {
  return sentimentColorScale(sentiment);
}

function updateInfoLabel(count) {
  const label =
    count > 0
      ? `[ Nodos seleccionados: ${count} ]`
      : "[ Nodos seleccionados: 0 ]";
  d3.select("#info-label").text(label);
}

function createTooltip() {
  return d3
    .select("#pca-scatter")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", 0);
}

function updateTooltip(tooltip, sentimentScore, d, color) {
  let sentimentIcon = getSentimentIcon(sentimentScore);

  tooltip
    .html(
      `
        <div style="display: flex; flex-direction: column; max-width: 350px; word-wrap: break-word;">
            <div style="background-color: #293133; color: ${color}; padding: 5px; border-radius: 5px; font-weight: bold; font-size: 25px;">
                ${sentimentIcon}
            </div>
            <div style="width: 100%; height: 10px; background-color: ${color}; margin: 5px 0;"></div>
            <div style="background-color: #333; color: ${color}; padding: 5px; border-radius: 5px;">
                ${d.Comment || "N/A"}<br/><br/>
                <span style="color: white;">${
                  d.processed_comment || "N/A"
                }</span>
            </div>
        </div>
    `
    )
    .style("left", event.pageX + 5 + "px")
    .style("top", event.pageY - 28 + "px");
}

function getSentimentIcon(sentimentScore) {
  if (sentimentScore > 0.5) {
    return "💚";
  } else if (sentimentScore < -0.5) {
    return "❌";
  } else {
    return "🤍";
  }
}

function drawChart() {
  const file = "data_result.csv";
  const metric = document.getElementById("metric").value;
  clusteringAlgorithm = document.getElementById("clustering-algorithm").value;

  if (currentChart === "Experiment1") {
    xColumn = "x_new";
    yColumn = "y_new";

  } else {
    // Configuración normal según el gráfico seleccionado
    xColumn = currentChart === "PCA" ? "PCA1" : currentChart === "UMAP" ? `UMAP1_${metric}` : `TSNE1_${metric}`;
    yColumn = currentChart === "PCA" ? "PCA2" : currentChart === "UMAP" ? `UMAP2_${metric}` : `TSNE2_${metric}`;
  }

  if (clusteringAlgorithm === "Sentiment") 
  {
    clusterColumn = "sentiment";
  } 
  else if (clusteringAlgorithm === "Kmeans") 
  {
    if (currentChart === "PCA") 
    {
      clusterColumn = "kmeans_pca";
    } 
    else if (currentChart === "UMAP") 
    {
      clusterColumn = `kmeans_umap_${metric}`;
    } 
    else if (currentChart === "TSNE")
    {
      clusterColumn = `kmeans_tsne_${metric}`;
    }
  } 
  else if (clusteringAlgorithm === "DBscan") 
  {
    if (currentChart === "PCA") 
    {
      clusterColumn = "dbscan_pca";
    } 
    else if (currentChart === "UMAP") 
    {
      clusterColumn = `dbscan_umap_${metric}`;
    } 
    else if (currentChart === "TSNE")
    {
      clusterColumn = `dbscan_tsne_${metric}`;
    }
  } 
  
  else if (clusteringAlgorithm === "HDBscan") 
  {      
    clusterColumn = "hdbscan_cluster";
  } 
  else {
    console.error(
      "No se encontró una combinación válida de gráfico y algoritmo de clustering"
    );
    return;
  }

  d3.csv(file).then(function (data) {
// Eliminar todo el contenido de los contenedores de leyenda y gráfico
d3.select("#pca-scatter").select("svg").remove();  // Eliminar todo el SVG del gráfico
d3.select("#keyword-legend-container").selectAll("*").remove();  // Eliminar todo dentro del contenedor de la leyenda

const width = window.innerWidth * 0.65;
const height = window.innerHeight * 0.50;
const margin = { top: 10, right: 10, bottom: 10, left: 10 };

const svg = d3
  .select("#pca-scatter")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .style("transform", "translate(-20px, 0)")
  .style("background-color", "#333");

// Datos de la leyenda de los sentimientos
const legendData = [
  { label: "Muy negativo", emoji: "❌❌❌" },
  { label: "Negativo", emoji: "❌❌" },
  { label: "Neutral", emoji: "🤍" },
  { label: "Positivo", emoji: "💚💚" },
  { label: "Muy positivo", emoji: "💚💚💚" },
];

// Paso 1: Obtener los valores únicos de los clusters, excluyendo -1
const uniqueValues = data
  .map(d => d[clusterColumn])  // Obtener todos los valores de clusters
  .filter(value => value !== -1);  // Excluir el valor -1

// Paso 2: Configuración de la escala de colores para los valores de los clusters
const colorScaleBase = d3.scaleOrdinal()
  .domain(uniqueValues)  // Define los valores únicos
  .range(d3.schemeCategory10.slice(0, uniqueValues.length));  // Ajusta la cantidad de colores según los valores únicos

// Paso 3: Extender la escala para incluir un color específico para -1
const colorScale = value => {
  if (value == -1) {
    return outlier_color;  // Asignar color específico para el valor -1
  }
  return colorScaleBase(value);  // Usar la escala base para otros valores
};

// **Leyenda de los keywords**
const keywordsData = [...new Set(data.map(d => d.keywords))]; // Obtenemos los valores únicos de los keywords

// Seleccionamos el contenedor donde se agregará la leyenda
const keywordLegendContainer = d3.select("#keyword-legend-container")
  .style("position", "relative");  // Asegura que el contenedor tenga un contexto relativo para la posición

// Ajustar el tamaño total del SVG del contenedor
const totalWidth = 1200; // Ajustar según el tamaño total que desees para el contenedor
const keywordLegendWidth = totalWidth * 0.8; // 80% del ancho para la leyenda de los keywords
const emojiLegendWidth = totalWidth * 0.2; // 20% para la leyenda de los emojis

// **Leyenda de los keywords**: Esta estará en la esquina superior izquierda
const keywordLegend = keywordLegendContainer
  .append("svg")  // Aseguramos que la leyenda se agregue dentro de un SVG dentro del contenedor
  .attr("width", keywordLegendWidth + 300)  // Asignamos el 80% de ancho
  .attr("height", 200)  // Ajusta la altura de la leyenda
  .attr("x", 0)  // Desplazamos la leyenda hacia la izquierda dentro del SVG
  .style("position", "absolute")  // Establecemos el posicionamiento dentro del SVG
  .style("top", "10")  // Alineamos en la parte superior del SVG
  .style("left", "0");  // Alineamos a la izquierda dentro del SVG

// Configuración para la disposición de los elementos en una cuadrícula
const itemsPerRow = 5;  // Cantidad de elementos por fila
const itemWidth = 175;   // Espacio horizontal entre columnas
const itemHeight = 18;   // Espacio vertical entre filas

// Añadir los valores de los keywords a la leyenda
keywordsData.forEach((keyword, i) => {
  const clusterValue = data.find(d => d.keywords === keyword)[clusterColumn];  // Obtener el valor de 'clusterColumn' para este keyword

  // Calcular la posición en la cuadrícula
  const col = i % itemsPerRow;  // Columna en la cuadrícula
  const row = Math.floor(i / itemsPerRow);  // Fila en la cuadrícula

  // Añadir círculo de color para cada keyword
  keywordLegend
    .append("circle")
    .attr("cx", col * itemWidth + 20)  // Posición horizontal basada en la columna
    .attr("cy", row * itemHeight + 5)  // Posición vertical basada en la fila
    .attr("r", 6)
    .style("fill", colorScale(clusterValue));  // Color del cluster según 'clusterColumn'

  // Añadir texto con el nombre del keyword
  keywordLegend
    .append("text")
    .attr("x", col * itemWidth + 35)  // Posición horizontal ajustada para el texto
    .attr("y", row * itemHeight + 10)  // Posición vertical ajustada para el texto
    .text(keyword)
    .style("font-size", "9px")
    .style("fill", "#fff");
});

// **Leyenda de los sentimientos (legendData)**
// Crear el grupo de leyenda para los sentimientos en el contenedor principal
const emojiLegend = keywordLegendContainer
  .append("svg")  // Aseguramos que la leyenda se agregue dentro de un SVG dentro del contenedor
  .attr("width", emojiLegendWidth)  // Asignamos el 20% de ancho
  .attr("height", 200)  // Ajusta la altura de la leyenda
  .attr("x", keywordLegendWidth)  // Desplazamos la leyenda hacia la derecha dentro del SVG
  .style("position", "absolute")  // Alineamos en la parte superior derecha del contenedor
  .style("top", "0")
  .style("right", "0");

// Añadir los elementos de la leyenda de los sentimientos
legendData.forEach((d, i) => {
  emojiLegend
    .append("text")
    .attr("x", 100)  // Alineamos a la izquierda en el contenedor
    .attr("y", i * 20 + 12)  // Ajusta el espacio entre cada elemento de la leyenda
    .text(d.emoji + " " + d.label)
    .style("font-size", "10px")
    .style("fill", "#fff");
});




    // const defs = svg.append("defs");

    // const gradient = defs
    //   .append("linearGradient")
    //   .attr("id", "legendGradient")
    //   .attr("x1", "0%")
    //   .attr("y1", "0%")
    //   .attr("x2", "100%")
    //   .attr("y2", "0%");

    // gradient.append("stop").attr("offset", "0%").attr("stop-color", "red");

    // gradient.append("stop").attr("offset", "50%").attr("stop-color", "yellow");

    // gradient.append("stop").attr("offset", "100%").attr("stop-color", "green");

    // const legendWidth = 150;
    // const legendXPosition =
    //   (width + margin.left -500 + margin.right - legendWidth) / 2;

    // svg
    //   .append("rect")
    //   .attr("x", legendXPosition)
    //   .attr("y", margin.top - 40)
    //   .attr("width", legendWidth)
    //   .attr("height", 15)
    //   .style("fill", "url(#legendGradient)");

    // svg
    //   .append("text")
    //   .attr("x", legendXPosition)
    //   .attr("y", margin.top - 45)
    //   .style("fill", "white")
    //   .style("font-size", "10px")
    //   .text("Negativo");

    // svg
    //   .append("text")
    //   .attr("x", legendXPosition + legendWidth / 2 - 10)
    //   .attr("y", margin.top - 45)
    //   .style("fill", "white")
    //   .style("font-size", "12px")
    //   .text("Neutro");

    // svg
    //   .append("text")
    //   .attr("x", legendXPosition + legendWidth - 40)
    //   .attr("y", margin.top - 45)
    //   .style("fill", "white")
    //   .style("font-size", "12px")
    //   .text("Positivo");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => +d[xColumn]))
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => +d[yColumn]))
      .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickSize(-height).tickPadding(10))
      .selectAll("text")
      .style("fill", "gold");

    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(-width).tickPadding(10))
      .selectAll("text")
      .style("fill", "gold");

    const tooltip = d3
      .select("#pca-scatter")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0);

    const circles = g
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(+d[xColumn]))
      .attr("cy", (d) => yScale(+d[yColumn]))
      .attr("r", 5)
      .style("fill", (d) => {
        if (clusteringAlgorithm === "Sentiment") {
          return getSentimentColor(+d.sentiment_processed_comment);
        } else {
          // Verifica si es outlier
          if (d[clusterColumn].trim() === "-1") {
            return outlier_color; 
          } else {
            return colorScale(d[clusterColumn]); 
          }
        }
      })
      .on("mouseover", function (event, d) {
        const sentimentScore = +d.sentiment_processed_comment;
        const color =
          clusteringAlgorithm === "Sentiment"
            ? getSentimentColor(sentimentScore)
            : colorScale(d[clusterColumn]);
        updateTooltip(tooltip, sentimentScore, d, color);
        tooltip.transition().duration(200).style("opacity", 0.9);
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    let selectionBox;
    let startX, startY;

    svg.on("mousedown", function (event) {
      if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
      }

      const coords = d3.pointer(event);
      startX = coords[0] - margin.left;
      startY = coords[1] - margin.top;

      selectionBox = g
        .append("rect")
        .attr("x", startX)
        .attr("y", startY)
        .attr("width", 0)
        .attr("height", 0)
        .style("fill", "rgba(255, 0, 255, 0.3)")
        .style("pointer-events", "none");
    });

    svg.on("mousemove", function (event) {
      if (selectionBox) {
        const coords = d3.pointer(event);
        const width = coords[0] - margin.left - startX;
        const height = coords[1] - margin.top - startY;

        selectionBox
          .attr("width", Math.abs(width))
          .attr("height", Math.abs(height))
          .attr("x", width < 0 ? coords[0] - margin.left : startX)
          .attr("y", height < 0 ? coords[1] - margin.top : startY);
      }
    });

    svg.on("mouseup", function () {
      if (selectionBox) {
        const coords = d3.pointer(event);
        const boxX = parseFloat(selectionBox.attr("x"));
        const boxY = parseFloat(selectionBox.attr("y"));
        const boxWidth = parseFloat(selectionBox.attr("width"));
        const boxHeight = parseFloat(selectionBox.attr("height"));

        const selectedNodes = data.filter((d) => {
          const cx = xScale(+d[xColumn]);
          const cy = yScale(+d[yColumn]);
          return (
            cx >= boxX &&
            cx <= boxX + boxWidth &&
            cy >= boxY &&
            cy <= boxY + boxHeight
          );
        });

        selectedNodes.sort((a, b) => {
          const clusterA = a[clusterColumn];
          const clusterB = b[clusterColumn];

          if (clusterA < clusterB) return -1;
          if (clusterA > clusterB) return 1;
          return 0;
        });

        updateInfoLabel(selectedNodes.length);

        const nodeList = d3.select("#node-list");
        nodeList.selectAll("*").remove();
        selectedNodes.forEach((node) => {
          let color;
          let sentimentIcon;

          if (clusteringAlgorithm === "Sentiment") {
            color = getSentimentColor(+node.sentiment_processed_comment);

            const sentimentScore = +node.sentiment_processed_comment;
            if (sentimentScore > 0.5) {
              sentimentIcon = "💚";
            } else if (sentimentScore < -0.5) {
              sentimentIcon = "❌";
            } else {
              sentimentIcon = "🤍";
            }
          } else {
            if (node[clusterColumn].trim() === "-1") { 
              color = outlier_color
            } else {
              color = colorScale(node[clusterColumn]);
            }
          }

          sentimentIcon = sentimentIcon || "🔍";

          const nodeDiv = nodeList
            .append("div")
            .style("background-color", color)
            .style("padding", "5px")
            .style("margin-bottom", "5px")
            .style("border-radius", "5px")
            .style("width", "95%")
            .style("color", "#fff")
            .style("font-family", "Roboto, sans-serif")
            .style("font-size", "16px");

          const scaledContainer = nodeDiv
            .append("div")
            .style("width", "100%")
            .style("height", "auto")
            .style("padding", "-5px")
            .style("margin", "0")
            .style("overflow", "hidden")
            .style("font-size", "12px");

          scaledContainer.html(`
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 30px; background-color: #293133; padding: 5px;">
                        <div style="font-size: 25px;">${sentimentIcon}</div>
                    </div>
                    <div style="width: 100%; height: 5px; background-color: ${color}; margin: 5px 0;"></div>
                    <div style="background-color: #333; color: ${color}; padding: 5px; border-radius: 5px;">
                        <span style="font-weight: bold; color: #fff; font-size: 15px; text-align: center; display: block;">[ ${
                          node.section || "N/A"
                        } ]</span>
                        <hr style="border: none; height: 4px; background-color: ${color}; margin: 5px 0;">
                        <span style="font-weight: bold; color: #fff; font-size: 15px; text-align: center; display: block;">${
                          node.headline || "N/A"
                        }</span>
                        <hr style="border: none; height: 4px; background-color: ${color}; margin: 5px 0;"><br>
                        <span style="color: white; font-size: 16px;">${
                          node.Comment || "N/A"
                        }</span><br/><br/>
                        <span style="font-size: 17px;">${
                          node.processed_comment || "N/A"
                        }</span><br/><br/>
                        <div style="text-align: center;">
                            <span style="color: white; font-size: 17px;"><em>[ ${
                              node.keywords || "N/A"
                            } ]</em></span><br/>
                        </div>
                        <br/>
                    </div>
                `);

          const darkRect = scaledContainer
            .append("div")
            .style("width", "100%")
            .style("height", "auto")
            .style("background-color", "#293133")
            .style("margin-top", "5px")
            .style("padding", "5px")
            .style("border-radius", "5px");

          darkRect
            .append("div")
            .text("Vader Results")
            .style("text-align", "center")
            .style("font-weight", "bold")
            .style("color", "#fff")
            .style("margin-bottom", "-15px");

          const table = darkRect
            .append("table")
            .style("width", "100%")
            .style("border-collapse", "collapse");

          const thead = table.append("thead");
          const tbody = table.append("tbody");

          thead
            .append("tr")
            .selectAll("th")
            .data(["Negative", "Neutral", "Positive", "Compound"])
            .enter()
            .append("th")
            .text((d) => d)
            .style("border", "1px solid #fff")
            .style("color", "#171614")
            .style("background-color", color)
            .style("padding", "5px")
            .style("text-align", "center");

          tbody
            .append("tr")
            .selectAll("td")
            .data([
              (+node.vader_neg * 100).toFixed(2),
              (+node.vader_neu * 100).toFixed(2),
              (+node.vader_pos * 100).toFixed(2),
              (+node.vader_compound).toFixed(2),
            ])
            .enter()
            .append("td")
            .text((d, i) => (i < 3 ? `${d}%` : d))
            .style("border", "1px solid #fff")
            .style("color", "#fff")
            .style("padding", "5px")
            .style("text-align", "center");

          darkRect
            .append("div")
            .text("Valencia Arousal Results")
            .style("text-align", "center")
            .style("font-weight", "bold")
            .style("color", "#fff")
            .style("margin-top", "10px")
            .style("margin-bottom", "-15px");

          const valenciaTable = darkRect
            .append("table")
            .style("width", "100%")
            .style("border-collapse", "collapse");

          const valenciaThead = valenciaTable.append("thead");
          const valenciaTbody = valenciaTable.append("tbody");

          valenciaThead
            .append("tr")
            .selectAll("th")
            .data(["Valencia", "Arousal", "Interpretacion"])
            .enter()
            .append("th")
            .text((d) => d)
            .style("border", "1px solid #fff")
            .style("color", "#171614")
            .style("background-color", color)
            .style("padding", "5px")
            .style("text-align", "center");

          valenciaTbody
            .append("tr")
            .selectAll("td")
            .data([
              (+node.valencia).toFixed(2),
              (+node.arousal).toFixed(2),
              node.interpretacion || "N/A",
            ])
            .enter()
            .append("td")
            .text((d) => d)
            .style("border", "1px solid #fff")
            .style("color", "#fff")
            .style("padding", "5px")
            .style("text-align", "center");

          const transformerResultsDiv = nodeDiv
            .append("div")
            .style("margin-top", "10px")
            .style("background-color", "#293133")
            .style("padding", "5px")
            .style("border-radius", "5px");

          const transformerTableDiv = transformerResultsDiv
            .append("table")
            .style("width", "100%")
            .style("font-size", "12px")
            .style("border-collapse", "collapse");

          const transformerTableThead = transformerTableDiv.append("thead");
          const transformerTableTbody = transformerTableDiv.append("tbody");

          transformerTableThead
            .append("tr")
            .selectAll("th")
            .data(["Modelo", "Resultado", "Emoticón"])
            .enter()
            .append("th")
            .text((d) => d)
            .style("border", "1px solid #fff")
            .style("color", "#171614")
            .style("background-color", color)
            .style("padding", "5px")
            .style("text-align", "center");

          function getEmoticon(value) {
            if (value === undefined || value === "N/A") {
              return "🤍";
            }
            switch (value) {
              case "Muy negativo":
                return "❌❌❌";
              case "Negativo":
                return "❌❌";
              case "Neutral":
                return "🤍";
              case "Positivo":
                return "💚💚";
              case "Muy positivo":
                return "💚💚💚";
              default:
                return "🤍";
            }
          }

          const models = [
            { name: "Bert", key: "bert_result" },
            { name: "RoBERTa", key: "roberta_result" },
            { name: "DistilBERT", key: "distilbert_result" },
            { name: "alBERT", key: "albert_result" },
          ];

          models.forEach((model) => {
            const resultValue = node[model.key];
            const emoticon = getEmoticon(resultValue);

            const row = transformerTableTbody.append("tr");

            row
              .selectAll("td")
              .data([
                model.name,
                resultValue !== undefined ? resultValue : "N/A",
                emoticon,
              ])
              .enter()
              .append("td")
              .text((d) => d)
              .style("border", "1px solid #fff")
              .style("color", "#fff")
              .style("padding", "5px")
              .style("text-align", "center")
              .style("font-size", (d, i) => {
                if (i === 0) return "18px";
                if (i === 2) return "24px";
                return "14px";
              });
          });
        });

        selectionBox.remove();
        selectionBox = null;
      }
    });

    svg.on("mouseleave", function () {
      if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
      }
    });
  });
}

// d3.select("#generate-chart").on("click", function () {
//   currentChart = d3.select("#dim-reduction").property("value");
//   clusteringAlgorithm = d3.select("#clustering-algorithm").property("value");
//   d3.select("#node-list").selectAll("*").remove();
//   drawChart();
// });

d3.select("#generate-chart").on("click", function () {
    currentChart = d3.select("#dim-reduction").property("value");
    clusteringAlgorithm = d3.select("#clustering-algorithm").property("value");
    d3.select("#node-list").selectAll("*").remove();
  
    // Redibujar el gráfico
    drawChart();
});


