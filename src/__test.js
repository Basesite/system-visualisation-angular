const PipeStatus = {
  PLANNED: "PLANNED",
  INSTALLED: "INSTALLED",
  DECOMMISSIONED: "REMOVED",
};

class Pipe {
  constructor(id, type, direction = null) {
    this.id = id;
    this.type = type; // 'submain', 'lateral', or 'tool'
    this.direction = direction;
    this.upstreamPipe = null;
    this.children = [];
    this.path = [];

    // Add capacity based on pipe type
    switch (type) {
      case "submain":
        this.capacity = SUBMAIN_CAPACITY;
        break;
      case "lateral":
        this.capacity = LATERAL_CAPACITY;
        break;
      default:
        this.capacity = null; // Tools don't have capacity limits
    }

    // Initialize lifecycle properties
    this.installDate = new Date();
    this.deinstallDate = new Date();
    this.status = PipeStatus.PLANNED;
  }

  addChild(pipe) {
    this.children.push(pipe);
    pipe.upstreamPipe = this;

    // Set the path
    pipe.path = [...this.path, this];

    // Set direction if not specified
    if (!pipe.direction) {
      pipe.direction = this.direction === "x" ? "y" : "x";
    }
  }

  // Helper method to check if pipe is active at a given date
  isActiveAt(date) {
    if (!this.installDate || !this.deinstallDate) return false;
    return date >= this.installDate && date <= this.deinstallDate;
  }

  // Method to update status based on current date
  updateStatus(currentDate) {
    // Convert string dates to Date objects if needed
    const installDate =
      this.installDate instanceof Date
        ? this.installDate
        : new Date(this.installDate);
    const deinstallDate =
      this.deinstallDate instanceof Date
        ? this.deinstallDate
        : new Date(this.deinstallDate);
    currentDate =
      currentDate instanceof Date ? currentDate : new Date(currentDate);

    // console.log(`Updating status for ${this.id}:`, {
    //   currentDate: currentDate.toISOString(),
    //   installDate: installDate.toISOString(),
    //   deinstallDate: deinstallDate.toISOString(),
    //   comparison: {
    //     isAfterInstall: currentDate >= installDate,
    //     isBeforeDeinstall: currentDate <= deinstallDate,
    //   },
    // });

    if (!this.installDate || !this.deinstallDate) {
      this.status = PipeStatus.PLANNED;
    } else if (currentDate >= installDate && currentDate <= deinstallDate) {
      this.status = PipeStatus.INSTALLED;
    } else if (currentDate < installDate) {
      this.status = PipeStatus.PLANNED;
    } else {
      this.status = PipeStatus.DECOMMISSIONED;
    }

    // console.log(`Final status for ${this.id}: ${this.status}`);
  }
}

const SUBMAIN_CAPACITY = 300;
const LATERAL_CAPACITY = 50;

// Helper function to generate random load
function getRandomLoad() {
  return Number((Math.random() * 10 + 5).toFixed(2)); // Random load between 5 and 15
}

// Helper function to generate random dates
function generateRandomDates() {
  const today = new Date();
  const minLifetime = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
  const maxFutureMonths = 24; // Look up to 2 years in the future
  const maxPastMonths = 12; // Look up to 1 year in the past

  // Random install date between 1 year ago and 2 years in the future
  const installDate = new Date(
    today.getTime() +
      (Math.random() * (maxFutureMonths + maxPastMonths) - maxPastMonths) *
        30 *
        24 *
        60 *
        60 *
        1000
  );

  // Random deinstall date at least 1 week after install date
  const deinstallDate = new Date(
    installDate.getTime() +
      minLifetime +
      Math.random() * maxFutureMonths * 30 * 24 * 60 * 60 * 1000
  );
  console.log(installDate, deinstallDate);
  return { installDate, deinstallDate };
}

// Function to update loads throughout the network
function updateNetworkLoads(network) {
  function calculatePipeLoad(pipe) {
    if (pipe.children.length === 0) {
      return pipe.load || 0;
    }

    // Sum up children's loads
    pipe.load = pipe.children.reduce((sum, child) => {
      return sum + calculatePipeLoad(child);
    }, 0);

    // Round to 2 decimal places
    pipe.load = Number(pipe.load.toFixed(2));
    return pipe.load;
  }

  // Recalculate loads for all submains
  network.submains.forEach((submain) => {
    calculatePipeLoad(submain);
  });
}

// Create the network
function createPipeNetwork() {
  // Create submains (horizontal)
  const s01 = new Pipe("S01", "submain", "x");
  const s02 = new Pipe("S02", "submain", "x");

  // Helper function to calculate parent loads
  function calculateParentLoads(pipe) {
    if (pipe.children.length === 0) {
      return pipe.load || 0;
    }

    // Sum up children's loads
    pipe.load = pipe.children.reduce((sum, child) => {
      return sum + calculateParentLoads(child);
    }, 0);

    return pipe.load;
  }

  // Create laterals for S01
  const s01Laterals = Array.from({ length: 6 }, (_, i) => {
    const lateral = new Pipe(`L${i + 1}`, "lateral");
    s01.addChild(lateral);

    // Create tools for each lateral
    const tools = Array.from({ length: 5 }, (_, j) => {
      const tool = new Pipe(`T${j + 1}`, "tool");
      tool.load = getRandomLoad();
      lateral.addChild(tool);
      return tool;
    });

    return lateral;
  });

  // Create laterals for S02
  const s02Laterals = Array.from({ length: 6 }, (_, i) => {
    const lateral = new Pipe(`L${i + 1}`, "lateral");
    s02.addChild(lateral);

    // Create tools for each lateral
    const tools = Array.from({ length: 5 }, (_, j) => {
      const tool = new Pipe(`T${j + 1}`, "tool");
      tool.load = getRandomLoad();
      lateral.addChild(tool);
      return tool;
    });

    return lateral;
  });

  const submains = [s01, s02];

  // After creating the network, set random dates for tools and propagate status
  function setToolDatesAndPropagate(pipe) {
    if (pipe.type === "tool") {
      const { installDate, deinstallDate } = generateRandomDates();
      pipe.installDate = installDate;
      pipe.deinstallDate = deinstallDate;
      pipe.updateStatus(new Date());
    }

    pipe.children.forEach((child) => setToolDatesAndPropagate(child));
  }

  // In your network creation code:
  submains.forEach((submain) => {
    // First set dates for all tools
    setToolDatesAndPropagate(submain);

    // Then update all laterals
    submain.children.forEach((lateral) => {
      updateParentPipeDates(lateral);
    });

    // Finally update the submain itself
    updateParentPipeDates(submain);
  });

  // Calculate loads for all parent pipes
  calculateParentLoads(s01);
  calculateParentLoads(s02);

  return {
    submains: [s01, s02],
    network: [s01, s02],
  };
}

// After setting tool dates, update parent pipe dates
function updateParentPipeDates(pipe) {
  if (pipe.children.length > 0) {
    // Parent pipe's install date is the earliest child install date
    const childInstallDates = pipe.children
      .map((child) => child.installDate)
      .filter((date) => date !== null);

    const childDeinstallDates = pipe.children
      .map((child) => child.deinstallDate)
      .filter((date) => date !== null);

    //   console.log(`Updating dates for ${pipe.id}:`, {
    //     childInstallDates: childInstallDates.map((d) => d.toISOString()),
    //     childDeinstallDates: childDeinstallDates.map((d) => d.toISOString()),
    //   });

    if (childInstallDates.length > 0 && childDeinstallDates.length > 0) {
      pipe.installDate = new Date(Math.min(...childInstallDates));
      pipe.deinstallDate = new Date(Math.max(...childDeinstallDates));

      // console.log(`Set dates for ${pipe.id}:`, {
      //   installDate: pipe.installDate.toISOString(),
      //   deinstallDate: pipe.deinstallDate.toISOString(),
      // });
    }
  }

  // Update status based on current date
  pipe.updateStatus(new Date());

  // Recursively update parent pipes
  if (pipe.upstreamPipe) {
    updateParentPipeDates(pipe.upstreamPipe);
  }
}

function getPipeLength(type) {
  switch (type) {
    case "submain":
      return 800;
    case "lateral":
      return 150;
    case "tool":
      return 20;
    default:
      return 0;
  }
}

const colors = {
  submain: "#00b8d4",
  lateral: "orange",
  tool: "magenta",
};

const lineWidths = {
  submain: 8,
  lateral: 4,
  tool: 1.5,
};

// Function to render the network as SVG
function renderNetworkSVG(network) {
  const svgContainer = document.getElementById("diagramContainer");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "1000");
  svg.setAttribute("height", "600");
  svg.setAttribute("viewBox", "0 0 1000 600");

   // Define status icons in defs
   const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
   defs.innerHTML = `
     <!-- Installed (green checkmark in circle) -->
     <symbol id="status-installed" viewBox="0 0 24 24">
       <circle cx="12" cy="12" r="10" fill="none" stroke="green" stroke-width="2"/>
       <path d="M6 12l4 4 8-8" fill="none" stroke="green" stroke-width="2"/>
     </symbol>
     
     <!-- Planned (clock in circle) -->
     <symbol id="status-planned" viewBox="0 0 24 24">
       <circle cx="12" cy="12" r="10" fill="none" stroke="orange" stroke-width="2"/>
       <path d="M12 7v5l3 3" fill="none" stroke="orange" stroke-width="2"/>
     </symbol>
     
     <!-- Decommissioned (X in circle) -->
     <symbol id="status-decommissioned" viewBox="0 0 24 24">
       <circle cx="12" cy="12" r="10" fill="none" stroke="red" stroke-width="2"/>
       <path d="M8 8l8 8m-8 0l8-8" fill="none" stroke="red" stroke-width="2"/>
     </symbol>
   `;
   svg.appendChild(defs);

  // Add/update controls
  //addDiagramControls(svgContainer);

  // Get visualization settings from controls
  const useLoadWidth =
    document.getElementById("toggleLoadWidth")?.checked ?? true;
  const colorMode = document.getElementById("colorMode")?.value ?? "loadScale";

  const currentDate = new Date(document.getElementById("networkDate").value);

  function addLabel(x, y, text, status) {
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    label.setAttribute("x", x);
    label.setAttribute("y", y);
    label.setAttribute("fill", "#000");
    label.setAttribute("font-family", "monospace");
    label.setAttribute("font-size", "8");
    label.textContent = text;

    if (status === PipeStatus.DECOMMISSIONED) {
      label.setAttribute("text-decoration", "line-through");
      label.setAttribute("fill", "#999");
    }

    if (status === PipeStatus.INSTALLED) {
        
        label.setAttribute("fill", "lime");
      }

      if (status === PipeStatus.PLANNED) {
        
        label.setAttribute("fill", "orange");
      }

    if (x > 800) {
      label.setAttribute("x", x - 5);
      label.setAttribute("text-anchor", "end");
    } else {
      label.setAttribute("x", x + 5);
      label.setAttribute("text-anchor", "start");
    }

    svg.appendChild(label);

    
  }

  function drawPipe(pipe, startX, startY, parentLength) {
    const pipeElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );

    const length = getPipeLength(pipe.type);

    let x1 = startX;
    let y1 = startY;
    let x2 = startX;
    let y2 = startY;

    if (pipe.direction === "x") {
      x2 += length;
    } else {
      y2 += length;
    }

    pipeElement.setAttribute("x1", x1);
    pipeElement.setAttribute("y1", y1);
    pipeElement.setAttribute("x2", x2);
    pipeElement.setAttribute("y2", y2);
    pipeElement.setAttribute("stroke", colors[pipe.type]);
    pipeElement.setAttribute("stroke-width", lineWidths[pipe.type]);
    // pipeElement.setAttribute("stroke-linecap", "round"); // Optional: adds rounded ends to lines

    if (pipe.status === PipeStatus.DECOMMISSIONED) {
      pipeElement.setAttribute("stroke-dasharray", "1 1");
      pipeElement.setAttribute("stroke", "#999");
    }

    svg.appendChild(pipeElement);

    const labelText = `${pipe.id}` // [${pipe.status}]`;
    addLabel(x2, y2, labelText, pipe.status );

    // Add load label at center of pipe
    const centerX = x1 + (x2 - x1) / 2;
    const centerY = y1 + (y2 - y1) / 2;

    const labelOffset = pipe.children.length > 0 ? 15 : 5;

    if (pipe.load) {
      const loadLabel = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      loadLabel.setAttribute("x", centerX);
      loadLabel.setAttribute("y", centerY - labelOffset); // Offset slightly above the pipe
      loadLabel.setAttribute("fill", "blue");
      loadLabel.setAttribute("font-family", "monospace");
      loadLabel.setAttribute("font-size", "6");
      loadLabel.setAttribute("text-anchor", "middle");
      // Rotate text for vertical pipes
      if (pipe.direction === "y") {
        loadLabel.setAttribute(
          "transform",
          `rotate(-90 ${centerX} ${centerY})`
        );
      }

      // Add strikethrough for decommissioned pipes
      if (pipe.status === PipeStatus.DECOMMISSIONED) {
        loadLabel.setAttribute("text-decoration", "line-through");
        loadLabel.setAttribute("fill", "#999"); // Optional: lighter grey for decommissioned
      }

      loadLabel.textContent = pipe.load.toFixed(2);
      svg.appendChild(loadLabel);
    }

    if (pipe.children.length > 0) {
      const actualParentLength = getPipeLength(pipe.type);
      const spacing = actualParentLength / (pipe.children.length + 1);

      pipe.children.forEach((child, index) => {
        let childStartX = x1;
        let childStartY = y1;

        if (pipe.direction === "x") {
          childStartX += spacing * (index + 1);
        } else {
          childStartY += spacing * (index + 1);
        }

        drawPipe(child, childStartX, childStartY, actualParentLength);
      });
    }
  }

  // Draw each submain
  network.submains.forEach((submain, index) => {
    drawPipe(submain, 50, 100 + index * 200, 800);
  });
  svgContainer.appendChild(svg);

  const segments = generateSegments(network, currentDate);
  renderSegments(segments, svg, { useLoadWidth, colorMode, currentDate });

  return svg;
}

// Function to update SVG diagram
function updateSVGDiagram(network) {
  // Get the container
  const container = document.getElementById("diagramContainer");

  // Remove existing SVG
  const oldSvg = container.querySelector("svg");
  if (oldSvg) {
    container.removeChild(oldSvg);
  }

  // Create new SVG
  const newSvg = renderNetworkSVG(network);

  // Insert the new SVG at the beginning of the container
  container.insertBefore(newSvg, container.firstChild);
}

function renderNetworkJSON(network) {
  const pre = document.createElement("pre");

  pre.style.cssText = `
        background: #2a2a2a;
        color: #fff;
        padding: 20px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 19px;
        overflow: auto;
        max-height: 600px;
        border: 1px solid #333;
    `;

  function simplifyPipe(pipe) {
    return {
      id: pipe.id,
      type: pipe.type,
      direction: pipe.direction,
      path: pipe.path.map((p) => p.id),
      children: pipe.children.map(simplifyPipe),
    };
  }

  const simplifiedNetwork = network.submains.map(simplifyPipe);
  const jsonString = JSON.stringify(simplifiedNetwork, null, 2);

  // Create safe HTML with proper syntax highlighting
  const colorizedJson = jsonString.replace(
    /(".*?")|(\b\d+\b)|(\b(true|false)\b)|([{}\[\],])|(\b[a-zA-Z]+\b)/g,
    (match, string, number, boolean, b, bracket, word) => {
      if (string) {
        return `<span style="color: #ce9178">${match}</span>`;
      } else if (number) {
        return `<span style="color: #b5cea8">${match}</span>`;
      } else if (boolean) {
        return `<span style="color: #569cd6">${match}</span>`;
      } else if (bracket) {
        return `<span style="color: #fff">${match}</span>`;
      } else if (word) {
        return `<span style="color: #9cdcfe">${match}</span>`;
      }
      return match;
    }
  );

  // Safely set the HTML content
  pre.innerHTML = colorizedJson;

  return pre;
}

// Add this to your existing code to display all three views

function renderNetworkTable(network) {
  const table = document.createElement("table");
  table.style.fontFamily = "monospace";
  table.style.margin = "20px";
  table.style.color = "#fff";
  table.style.borderCollapse = "collapse";

  // Add CSS for the table
  const style = document.createElement("style");
  style.textContent = `
        .network-table td {
            padding: 4px 8px;
        }
        .network-table .submain {
            color: #00b8d4;
        }
        .network-table .lateral {
            color: #ff5722;
        }
        .network-table .tool {
            color: #e91e63;
        }
    `;
  document.head.appendChild(style);
  table.classList.add("network-table");

  function addPipeToTable(pipe, indent = 0) {
    const row = table.insertRow();
    const cell = row.insertCell();

    // Create indentation using spaces
    const indentation = "    ".repeat(indent);

    // Create path string
    const pathStr = pipe.path.map((p) => p.id).join(" → ");

    // Format the row content
    cell.innerHTML = `${indentation}${pipe.id} <span style="color: #666">${pathStr}</span>`;
    cell.classList.add(pipe.type);

    // Recursively add children
    pipe.children.forEach((child) => {
      addPipeToTable(child, indent + 1);
    });
  }

  // Add header
  const headerRow = table.insertRow();
  const headerCell = headerRow.insertCell();
  headerCell.innerHTML = "<strong>Pipe Network Structure</strong>";
  headerCell.style.borderBottom = "1px solid #444";
  headerCell.style.paddingBottom = "10px";
  headerCell.style.marginBottom = "10px";

  // Add each submain and its children
  network.submains.forEach((submain) => {
    addPipeToTable(submain);
  });

  return table;
}

// Set your license key
// agGrid.LicenseManager.setLicenseKey("YOUR_LICENSE_KEY_HERE");
function createGridData(network) {
  // Helper function to create a clean object without circular references
  function flattenPipeData(pipe, parentPath = []) {
    // Create current path array
    const currentPath = [...parentPath, pipe.id];

    // Create the current row
    const row = {
      id: pipe.id,
      type: pipe.type,
      direction: pipe.direction,
      load: pipe.load ? Number(pipe.load.toFixed(2)) : null,
      installDate: pipe.installDate,
      deinstallDate: pipe.deinstallDate,
      status: pipe.status,

      path: currentPath,
    };

    // Start with current row
    let rows = [row];

    // Add all children rows
    if (pipe.children && pipe.children.length > 0) {
      pipe.children.forEach((child) => {
        rows = rows.concat(flattenPipeData(child, currentPath));
      });
    }

    return rows;
  }

  // Convert and flatten all submains
  const flatData = network.submains.flatMap((pipe) => flattenPipeData(pipe));
  console.log("Flat Grid Data:", JSON.stringify(flatData, null, 2));
  return flatData;
}

function createPipeNetworkGrid(container, network) {
  // Custom cell renderer for type column
  function TypeCellRenderer() {}
  TypeCellRenderer.prototype.init = function (params) {
    const typeColors = {
      submain: "#00b8d4",
      lateral: "#ff5722", // orange
      tool: "#e91e63", // magenta
    };

    this.eGui = document.createElement("div");
    this.eGui.style.cssText = `
            border: 2px solid ${typeColors[params.value]};
            border-radius: 10px;
            padding: 2px ;
            display: inline-block;
            color: ${typeColors[params.value]};
            text-align: center;
            min-width: 60px;
        `;
    this.eGui.textContent = params.value;
  };
  TypeCellRenderer.prototype.getGui = function () {
    return this.eGui;
  };

  function generateNewPipeId(
    parentPipe,
    existingChildren,
    relativePipe,
    insertBefore
  ) {
    // Extract the base part and number from the relative pipe ID
    const match = relativePipe.id.match(/(.*[LT])(\d+(\.\d+)?)$/);
    if (!match) return null;

    const [_, basePrefix, currentNum] = match;
    const currentNumber = parseFloat(currentNum);

    let newNumber;

    if (insertBefore) {
      // Find the previous sibling's number
      const prevSibling = existingChildren
        .filter((child) => child.id.startsWith(basePrefix))
        .find((child) => {
          const siblingNum = parseFloat(child.id.match(/\d+(\.\d+)?$/)[0]);
          return siblingNum < currentNumber;
        });

      if (prevSibling) {
        const prevNumber = parseFloat(prevSibling.id.match(/\d+(\.\d+)?$/)[0]);
        newNumber = (prevNumber + currentNumber) / 2;
      } else {
        // If no previous sibling, place halfway between 0 and current
        newNumber = currentNumber / 2;
      }
    } else {
      // Find the next sibling's number
      const nextSibling = existingChildren
        .filter((child) => child.id.startsWith(basePrefix))
        .find((child) => {
          const siblingNum = parseFloat(child.id.match(/\d+(\.\d+)?$/)[0]);
          return siblingNum > currentNumber;
        });

      if (nextSibling) {
        const nextNumber = parseFloat(nextSibling.id.match(/\d+(\.\d+)?$/)[0]);
        newNumber = (currentNumber + nextNumber) / 2;
      } else {
        // If no next sibling, add 1 to current
        newNumber = currentNumber + 1;
      }
    }

    // Format the new ID, ensuring we keep decimal places only if needed
    const formattedNumber =
      newNumber % 1 === 0 ? newNumber.toFixed(0) : newNumber.toFixed(1);
    return `${basePrefix}${formattedNumber}`;
  }

  function insertNewPipe(parentPipe, insertBefore, relativeToPipe, api) {
    // Determine pipe type based on parent
    const newPipeType = parentPipe.type === "submain" ? "lateral" : "tool";

    // Generate new ID
    const newId = generateNewPipeId(
      parentPipe,
      parentPipe.children,
      relativeToPipe,
      insertBefore
    );

    // Create new pipe
    const newPipe = new Pipe(newId, newPipeType);
    newPipe.direction = parentPipe.direction === "x" ? "y" : "x";

    // Add random load if it's a tool
    if (newPipeType === "tool") {
      newPipe.load = getRandomLoad();
    }

    // Find insertion index
    const insertIndex = parentPipe.children.indexOf(relativeToPipe);
    const newIndex = insertBefore ? insertIndex : insertIndex + 1;

    // Insert into parent's children array and set up the pipe properly
    parentPipe.children.splice(newIndex, 0, newPipe);
    newPipe.upstreamPipe = parentPipe;
    newPipe.path = [...parentPipe.path, parentPipe];

    // Recalculate loads up the network
    updateNetworkLoads(network);

    // Update grid
    const newData = createGridData(network);
    api.setGridOption("rowData", newData);

    // Add date picker listener
    // TODO: This is not working
    // document
    //   .getElementById("networkDate")
    //   .addEventListener("change", (event) => {
    //     const selectedDate = new Date(event.target.value);

    //     // Update status of all pipes in the network
    //     function updateAllPipeStatus(pipe, date) {
    //       pipe.updateStatus(date);
    //       pipe.children.forEach((child) => updateAllPipeStatus(child, date));
    //     }

    //     // Update all pipes in the network
    //     network.submains.forEach((submain) =>
    //       updateAllPipeStatus(submain, selectedDate)
    //     );

    //     // Update grid data
    //     const newData = createGridData(network);
    //     gridOptions.api.setRowData(newData);
    //   });

    // Update SVG diagram
    updateSVGDiagram(network);

    return newPipe;
  }

  // Function to add a child pipe
  function addChildPipe(parentPipe) {
    // Determine child type based on parent type
    let childType;
    if (parentPipe.type === "submain") {
      childType = "lateral";
    } else if (parentPipe.type === "lateral") {
      childType = "tool";
    } else {
      console.warn("Cannot add child to a tool");
      return null;
    }

    // Generate new ID based on existing children
    let newId;
    const prefix = childType === "lateral" ? "L" : "T";

    if (parentPipe.children.length === 0) {
      newId = `${prefix}1`;
    } else {
      // Find highest numbered child of the same type
      const existingNumbers = parentPipe.children
        .filter((child) => child.type === childType)
        .map((child) => {
          const match = child.id.match(/\d+(\.\d+)?$/);
          return match ? parseFloat(match[0]) : 0;
        });

      const highestNumber = Math.max(...existingNumbers, 0);
      newId = `${prefix}${highestNumber + 1}`;
    }

    // Create new pipe
    const newPipe = new Pipe(newId, childType);

    // Set direction based on parent
    newPipe.direction = parentPipe.direction === "x" ? "y" : "x";

    // Add random load if it's a tool
    if (childType === "tool") {
      newPipe.load = getRandomLoad();
      // Set random dates for tool
      const { installDate, deinstallDate } = generateRandomDates();
      newPipe.installDate = installDate;
      newPipe.deinstallDate = deinstallDate;
      newPipe.updateStatus(new Date());
    }

    // Add to parent
    parentPipe.addChild(newPipe);

    // If parent is a lateral, update its dates based on tools
    if (parentPipe.type === "lateral") {
      updateParentPipeDates(parentPipe);
    }

    // Update loads throughout the network
    updateNetworkLoads(network);

    // // Update grid
    // const newData = createGridData(network);
    // api.setGridOption("rowData", newData);

    // // Update SVG diagram
    // updateSVGDiagram(network);

    return newPipe;
  }

  const gridOptions = {
    columnDefs: [
      {
        field: "id",
        headerName: "Pipe ID",
        cellRenderer: "agGroupCellRenderer",
        showRowGroup: false,
        minWidth: 250,
      },
      {
        field: "type",
        headerName: "Type",
        minWidth: 120,
        // cellRenderer: TypeCellRenderer,
        // cellStyle: {
        //   display: "flex",
        //   alignItems: "center",
        //   padding: "4px 4px",
        // },
      },
      {
        field: "direction",
        headerName: "Direction",
        minWidth: 20,
        flex: 0.4,
      },
      {
        field: "load",
        headerName: "Load",
        minWidth: 100,
        valueFormatter: (params) =>
          params.value ? params.value.toFixed(2) : "",
        type: "numericColumn",
        flex: 0.5,
      },
      {
        field: "installDate",
        headerName: "Install Date",
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleDateString() : "",
      },
      {
        field: "deinstallDate",
        headerName: "Deinstall Date",
        valueFormatter: (params) =>
          params.value ? new Date(params.value).toLocaleDateString() : "",
      },
      {
        field: "status",
        headerName: "Status",
        cellStyle: (params) => {
          switch (params.value) {
            case PipeStatus.PLANNED:
              return { color: "blue" };
            case PipeStatus.INSTALLED:
              return { color: "green" };
            case PipeStatus.DECOMMISSIONED:
              return { color: "red" };
            default:
              return {};
          }
        },
      },
      {
        field: "path",
        headerName: "Path",
        minWidth: 120,
      },
    ],
    defaultColDef: {
      flex: 1,
      sortable: true,
      filter: true,
      resizable: true,
    },
    autoGroupColumnDef: {
      headerName: "Pipe Network",
      minWidth: 300,
      cellRendererParams: {
        suppressCount: true,
        innerRenderer: (params) =>
          params.data ? params.data.id : params.value,
      },
    },
    treeData: true,
    getDataPath: (data) => data.path,
    groupDefaultExpanded: -1,
    animateRows: true,
    rowData: createGridData(network),
    // theme: "legacy",
    themeParameters: {
      colors: {
        backgroundColor: "#1a1a1a",
        rowBackgroundColor: "#1a1a1a",
        rowHoverBackgroundColor: "#2a2a2a",
        primaryColor: "#00b8d4",
      },
      spacing: {
        treeIndent: 20,
      },
      borders: {
        rowBorderColor: "#333",
      },
    },
    getContextMenuItems: (params) => {
      if (!params.node) return [];

      console.log("Selected node data:", params.node.data);

      const pipe = findPipeById(
        network,
        params.node.data.id,
        params.node.data.path
      );
      if (!pipe) {
        console.log("Pipe not found:", params.node.data.id);
        return [];
      }

      const parentPipe = pipe.upstreamPipe;
      if (!parentPipe) {
        console.log("Parent pipe not found for:", pipe.id);
        return [];
      }

      console.log("Found pipe:", pipe.id, "with parent:", parentPipe.id);

      const menuItems = [];

      // Only add "Add Child" option if pipe is not a tool
      if (pipe.type !== "tool") {
        menuItems.push({
          name: "Add Child",
          action: () => {
            const newPipe = addChildPipe(pipe);
            // Update grid and diagram
            const newData = createGridData(network);
            params.api.setGridOption("rowData", newData);
            updateSVGDiagram(network);
          },
        });
      }

      menuItems.push({
        name: "Insert Before",
        action: () => {
          console.log(
            `Inserting before ${pipe.id} under parent ${parentPipe.id}`
          );
          const newPipe = insertNewPipe(parentPipe, true, pipe, params.api);
        },
      });

      menuItems.push({
        name: "Insert After",
        action: () => {
          console.log(
            `Inserting after ${pipe.id} under parent ${parentPipe.id}`
          );
          const newPipe = insertNewPipe(parentPipe, false, pipe, params.api);
        },
      });

      return menuItems;
    },
  };

  // Helper function to find pipe by ID
  function findPipeById(network, id, path) {
    // Helper function to find a pipe by following a specific path
    function findPipeByPath(pipe, pathIds) {
      if (pathIds.length === 0) return pipe;

      const nextId = pathIds[0];
      const child = pipe.children.find((c) => c.id === nextId);

      if (!child) return null;
      return findPipeByPath(child, pathIds.slice(1));
    }

    // If we have a path, use it for precise lookup
    if (path && path.length > 0) {
      const submain = network.submains.find((s) => s.id === path[0]);
      if (!submain) return null;
      return findPipeByPath(submain, path.slice(1));
    }

    // Fallback to searching by ID if no path is provided
    function searchPipe(pipe) {
      if (pipe.id === id) return pipe;
      for (const child of pipe.children) {
        const found = searchPipe(child);
        if (found) return found;
      }
      return null;
    }

    // Search through all submains
    for (const submain of network.submains) {
      const found = searchPipe(submain);
      if (found) return found;
    }

    return null;
  }
  const grid = new agGrid.createGrid(container, gridOptions);
  return gridOptions;
}

function findPipeById(network, id) {
  // Helper function to find a pipe by following a specific path
  function findPipeByPath(pipe, pathIds) {
    if (pathIds.length === 0) return pipe;

    const nextId = pathIds[0];
    const child = pipe.children.find((c) => c.id === nextId);

    if (!child) return null;
    return findPipeByPath(child, pathIds.slice(1));
  }

  // Get the pipe's full path from the grid data
  function findPipeWithPath(network, id, path) {
    // Find the submain (first in path)
    const submain = network.submains.find((s) => s.id === path[0]);
    if (!submain) return null;

    // Follow the path to find the exact pipe
    return findPipeByPath(submain, path.slice(1));
  }

  // When looking up a pipe, use both its ID and path
  function searchInNetwork(network, targetId, path) {
    if (!path || path.length === 0) {
      // Fallback to old search method if no path available
      for (const submain of network.submains) {
        const found = searchPipe(submain);
        if (found) return found;
      }
    }
    return findPipeWithPath(network, targetId, path);
  }

  function searchPipe(pipe) {
    if (pipe.id === id) return pipe;
    for (const child of pipe.children) {
      const found = searchPipe(child);
      if (found) return found;
    }
    return null;
  }

  return searchInNetwork(network, id, params.node.data.path);
}

// First, let's create a Segment class
class Segment {
  constructor(id, startPoint, endPoint, load = 0) {
    this.id = id;
    this.startPoint = startPoint; // {x: number, y: number}
    this.endPoint = endPoint; // {x: number, y: number}
    this.load = load;
    this.upstreamSegment = null;
    this.downstreamSegments = [];
    this.parentPipe = null; // Reference to the pipe this segment belongs to
  }

  addDownstreamSegment(segment) {
    this.downstreamSegments.push(segment);
    segment.upstreamSegment = this;
  }

  // Calculate segment length
  getLength() {
    const dx = this.endPoint.x - this.startPoint.x;
    const dy = this.endPoint.y - this.startPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

function generateSegments(network, currentDate = new Date()) {
  const segments = [];
  let segmentId = 1;

  function createSegmentsForPipe(pipe, startX, startY) {
    const pipeLength = getPipeLength(pipe.type);

    // Calculate pipe endpoints
    let endX = startX;
    let endY = startY;
    if (pipe.direction === "x") {
      endX += pipeLength;
    } else {
      endY += pipeLength;
    }

    // If pipe has children, create segments between each child connection
    if (pipe.children.length > 0) {
      const spacing = pipeLength / (pipe.children.length + 1);
      let lastPoint = { x: startX, y: startY };
      let lastSegment = null;
      let firstSegment = null; // Keep track of first segment

      // Create segments for each child connection
      pipe.children.forEach((child, index) => {
        // Calculate connection point
        let connectionX = startX;
        let connectionY = startY;
        if (pipe.direction === "x") {
          connectionX += spacing * (index + 1);
        } else {
          connectionY += spacing * (index + 1);
        }

        // Create segment from last point to this connection
        const segment = new Segment(
          `S${segmentId++}`,
          lastPoint,
          { x: connectionX, y: connectionY },
          0
        );
        segment.parentPipe = pipe;
        segments.push(segment);

        // Store first segment
        if (!firstSegment) {
          firstSegment = segment;
        }

        if (lastSegment) {
          lastSegment.downstreamSegments.push(segment);
          segment.upstreamSegment = lastSegment;
        }

        // Create child segments
        const childFirstSegment = createSegmentsForPipe(
          child,
          connectionX,
          connectionY
        );

        // Connect this segment to the first segment of the child
        if (childFirstSegment) {
          segment.downstreamSegments.push(childFirstSegment);
          childFirstSegment.upstreamSegment = segment;
        }

        lastPoint = { x: connectionX, y: connectionY };
        lastSegment = segment;
      });

      // Create final segment to end of pipe
      const finalSegment = new Segment(
        `S${segmentId++}`,
        lastPoint,
        { x: endX, y: endY },
        0
      );
      finalSegment.parentPipe = pipe;
      if (lastSegment) {
        lastSegment.downstreamSegments.push(finalSegment);
        finalSegment.upstreamSegment = lastSegment;
      }
      segments.push(finalSegment);

      return firstSegment; // Return first segment of this pipe
    } else {
      // For pipes without children (tools), create a single segment
      const segment = new Segment(
        `S${segmentId++}`,
        { x: startX, y: startY },
        { x: endX, y: endY },
        pipe.load // Use the tool's load
      );
      segment.parentPipe = pipe;
      segments.push(segment);
      return segment;
    }
  }

  // Generate segments for each submain
  network.submains.forEach((submain, index) => {
    createSegmentsForPipe(submain, 50, 100 + index * 200);
  });

  // Calculate loads after all segments are created
  function _working_calculateSegmentLoads() {
    // Find end segments (those without downstream segments)
    const endSegments = segments.filter(
      (s) => s.downstreamSegments.length === 0
    );

    // Process each end segment and propagate loads upstream
    endSegments.forEach((segment) => {
      let currentSegment = segment;
      while (currentSegment) {
        // For segments with multiple downstream connections,
        // make sure we only process them once all their downstream loads are calculated
        if (currentSegment.downstreamSegments.length > 0) {
          currentSegment.load = currentSegment.downstreamSegments.reduce(
            (sum, ds) => sum + ds.load,
            0
          );
        }
        currentSegment = currentSegment.upstreamSegment;
      }
    });
  }

  function calculateSegmentLoads() {
    // Find end segments (those without downstream segments)
    const endSegments = segments.filter(
      (s) => s.downstreamSegments.length === 0
    );

    // Process each end segment and propagate loads upstream
    endSegments.forEach((segment) => {
      let currentSegment = segment;
      while (currentSegment) {
        // For segments with multiple downstream connections,
        // make sure we only process them once all their downstream loads are calculated
        if (currentSegment.downstreamSegments.length > 0) {
          currentSegment.load = currentSegment.downstreamSegments.reduce(
            (sum, ds) =>
              sum +
              (ds.parentPipe.status === PipeStatus.DECOMMISSIONED
                ? 0
                : ds.load),
            0
          );
        }
        currentSegment = currentSegment.upstreamSegment;
      }
    });
  }

  // Update the loads
  calculateSegmentLoads();

  return segments;
}

function getColorForLoad(load, maxLoad) {
  // Convert value to percentage (0 to 1)
  const percentage = load / maxLoad;

  // Create color stops
  const colors = [
    { point: 0, color: [0, 255, 0] }, // Green
    { point: 0.5, color: [255, 255, 0] }, // Yellow
    { point: 1, color: [255, 0, 0] }, // Red
  ];

  // Find the color stops we're between
  let lower = colors[0];
  let upper = colors[colors.length - 1];

  for (let i = 0; i < colors.length - 1; i++) {
    if (percentage >= colors[i].point && percentage <= colors[i + 1].point) {
      lower = colors[i];
      upper = colors[i + 1];
      break;
    }
  }

  // Calculate how far we are between the two stops (0 to 1)
  const range = upper.point - lower.point;
  const rangePercentage = range === 0 ? 0 : (percentage - lower.point) / range;

  // Interpolate between the colors
  const r = Math.round(
    lower.color[0] + (upper.color[0] - lower.color[0]) * rangePercentage
  );
  const g = Math.round(
    lower.color[1] + (upper.color[1] - lower.color[1]) * rangePercentage
  );
  const b = Math.round(
    lower.color[2] + (upper.color[2] - lower.color[2]) * rangePercentage
  );

  return `rgba(${r}, ${g}, ${b}, 0.7)`;
}

// Function to render segments
function renderSegments(segments, svg, visualSettings = {}) {
  const {
    useLoadWidth = true,
    colorMode = "loadScale",
    currentDate = new Date(),
  } = visualSettings;

  segments.forEach((segment) => {
    const pipe = segment.parentPipe;
    pipe.updateStatus(currentDate);
    if (pipe.status === PipeStatus.DECOMMISSIONED) {
      return;
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", segment.startPoint.x);
    line.setAttribute("y1", segment.startPoint.y);
    line.setAttribute("x2", segment.endPoint.x);
    line.setAttribute("y2", segment.endPoint.y);

    const maxLoad = Math.max(...segments.map((s) => s.load));

    // Calculate line width
    let width;
    if (useLoadWidth) {
      const minWidth = 5;
      const maxWidth = 20;
      width = minWidth + (maxWidth - minWidth) * (segment.load / maxLoad);
    } else {
      width = lineWidths[segment.parentPipe.type] || 2; // Default fixed width
    }

    // // Get color based on load
    // const color = getColorForLoad(segment.load, segment.parentPipe.capacity);
    // Determine color based on mode
    let color;
    if (colorMode === "loadScale") {
      color = getColorForLoad(segment.load, segment.parentPipe.capacity);
    } else {
      // capacityWarning
      const capacity = segment.parentPipe.capacity;
      if (capacity && segment.load > capacity) {
        color = "rgba(255, 0, 0, 0.7)";
      } else {
        color = "rgba(0, 0, 255, 0.5)";
      }
    }

    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", width);
    svg.appendChild(line);

    // Add circle at start point
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", segment.startPoint.x);
    circle.setAttribute("cy", segment.startPoint.y);
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", "blue");
    svg.appendChild(circle);

    if (segment.downstreamSegments.length == 0) return;
    // only label the segment if we have downstream segments

    // Add load label at midpoint
    const midX = (segment.startPoint.x + segment.endPoint.x) / 2;
    const midY = (segment.startPoint.y + segment.endPoint.y) / 2;

    const loadLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    loadLabel.setAttribute("x", midX);
    loadLabel.setAttribute("y", midY - 5); // Offset slightly above line
    loadLabel.setAttribute("fill", "grey");
    loadLabel.setAttribute("font-family", "monospace");
    loadLabel.setAttribute("font-size", "5");
    loadLabel.setAttribute("text-anchor", "middle");

    // Add strikethrough for decommissioned pipes
    // if (segment.parentPipe.status === PipeStatus.DECOMMISSIONED) {
    //     loadLabel.setAttribute("text-decoration", "line-through");
    //     loadLabel.setAttribute("fill", "#999"); // Optional: lighter grey for decommissioned
    //   }

    // Determine if segment is vertical (y-direction)
    const isVertical = segment.startPoint.x === segment.endPoint.x;

    // If vertical, rotate the text
    if (isVertical) {
      loadLabel.setAttribute("transform", `rotate(-90 ${midX} ${midY})`);
    }

    loadLabel.textContent = segment.load.toFixed(2);

    svg.appendChild(loadLabel);

    // Add strikethrough line for decommissioned pipes
    if (segment.parentPipe.status === PipeStatus.DECOMMISSIONED) {
      const strikethrough = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      const textWidth = loadLabel.getComputedTextLength() || 20; // fallback width if getComputedTextLength isn't available

      if (isVertical) {
        strikethrough.setAttribute("x1", midX - 2);
        strikethrough.setAttribute("y1", midY + textWidth / 2);
        strikethrough.setAttribute("x2", midX - 2);
        strikethrough.setAttribute("y2", midY - textWidth / 2);
        strikethrough.setAttribute("transform", `rotate(-90 ${midX} ${midY})`);
      } else {
        strikethrough.setAttribute("x1", midX - textWidth / 2);
        strikethrough.setAttribute("y1", midY - 5);
        strikethrough.setAttribute("x2", midX + textWidth / 2);
        strikethrough.setAttribute("y2", midY - 5);
      }

      strikethrough.setAttribute("stroke", "#999");
      strikethrough.setAttribute("stroke-width", "0.5");
      svg.appendChild(strikethrough);
    }

    // Add capacity warning if load exceeds capacity
    const capacity = segment.parentPipe.capacity;
    const labelOffset = isVertical ? 15 : 15;
    if (capacity && segment.load > capacity) {
      const warningLabel = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      warningLabel.setAttribute("x", midX);
      warningLabel.setAttribute("y", midY - labelOffset); // Offset warning label
      warningLabel.setAttribute("fill", "red");
      warningLabel.setAttribute("font-family", "monospace");
      warningLabel.setAttribute("font-size", "6");
      warningLabel.setAttribute("font-weight", "bold");
      warningLabel.setAttribute("text-anchor", "middle");

      // Rotate warning label if segment is vertical
      if (isVertical) {
        warningLabel.setAttribute("transform", `rotate(-90 ${midX} ${midY})`);
      }

      const loadPercentageOfCapacity = (
        (segment.load / capacity) *
        100
      ).toFixed(0);
      warningLabel.textContent = `${loadPercentageOfCapacity}%`;
      svg.appendChild(warningLabel);

      // Add visual indicator (like a pulsing effect or dashed line)
      // line.setAttribute("stroke-dasharray", "5,3");
      // line.setAttribute("stroke-opacity", "0.8");

      line.classList.add("overcapacity");
    }
  });
}

// Helper function to get all relevant dates in the network
function getAllNetworkDates(network) {
  const dates = new Set();

  function collectDates(pipe) {
    if (pipe.installDate) dates.add(new Date(pipe.installDate).getTime());
    if (pipe.deinstallDate) dates.add(new Date(pipe.deinstallDate).getTime());
    pipe.children.forEach((child) => collectDates(child));
  }

  network.submains.forEach((submain) => collectDates(submain));
  return Array.from(dates);
}

function addDiagramControls(container) {
  const controlPanel = document.createElement("div");
  controlPanel.style.cssText = `
        margin-bottom: 10px;
        padding: 10px;
        background: #f5f5f5;
        border-radius: 4px;
    `;

  // Get date range for slider
  const allDates = getAllNetworkDates(network);
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const today = new Date();

  controlPanel.innerHTML = `
        <div style="display: flex; gap: 20px; align-items: center;">
            <label style="display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" id="toggleLoadWidth" checked>
                Variable line width based on load
            </label>
            
            <div style="display: flex; align-items: center; gap: 10px;">
                <label>Color mode:</label>
                <select id="colorMode">
                    <option value="loadScale">Load scale (green to red)</option>
                    <option value="capacityWarning">Capacity warning only</option>
                </select>
            </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <label>Network date:</label>
                <input type="date" id="networkDate" 
                    min="${minDate.toISOString().split("T")[0]}"
                    max="${maxDate.toISOString().split("T")[0]}"
                    value="${today.toISOString().split("T")[0]}">
                <span id="dateDisplay"></span>
            </div>
        </div>
    `;

  container.prepend(controlPanel);

  // Add event listeners to controls
  document.getElementById("toggleLoadWidth").addEventListener("change", () => {
    updateSVGDiagram(network);
  });

  document.getElementById("colorMode").addEventListener("change", () => {
    updateSVGDiagram(network);
  });

  document.getElementById("networkDate").addEventListener("change", () => {
    updateSVGDiagram(network);
  });

  return {
    widthToggle: document.getElementById("toggleLoadWidth"),
    colorMode: document.getElementById("colorMode"),
  };
}

// Add this to your existing code to display both the SVG and table

const network = createPipeNetwork();

const container = document.getElementById("container");
const controlsContainer = document.getElementById("controlsContainer");
addDiagramControls(controlsContainer);
console.log({ network });
renderNetworkSVG(network);
const gridContainer = document.getElementById("gridContainer");
const grid = createPipeNetworkGrid(gridContainer, network);

container.appendChild(renderNetworkJSON(network));
container.appendChild(renderNetworkTable(network));
