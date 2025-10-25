// Datos de la aplicación
let appData = {
    items: [],
    weapons: [],
    monsters: [],
    activities: []
};

// Variables para edición
let editingItemId = null;
let editingWeaponId = null;
let editingMonsterId = null;

// Elementos del DOM
const DOM = {
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    menuToggle: document.getElementById('menu-toggle'),
    closeSidebar: document.getElementById('close-sidebar'),
    dragIndicator: document.querySelector('.drag-indicator'),
    contentSections: document.querySelectorAll('.content-section'),
    navItems: document.querySelectorAll('.nav-item'),
    dashboardCards: document.querySelectorAll('.dashboard-card .btn-primary')
};

// Inicialización de la aplicación
function initApp() {
    loadData();
    setupEventListeners();
    renderDashboard();
    updateExportOptions();
    
    // Mostrar sección activa
    showSection('dashboard');
    
    // Añadir un drop por defecto
    addDropItem();
    
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    }
}

// Cargar datos del localStorage
function loadData() {
    const savedData = localStorage.getItem('wikiRolData');
    if (savedData) {
        appData = JSON.parse(savedData);
    } else {
        // Comenzar con datos vacíos
        appData = {
            items: [],
            weapons: [],
            monsters: [],
            activities: []
        };
        saveData();
    }
}

// Guardar datos en localStorage
function saveData() {
    localStorage.setItem('wikiRolData', JSON.stringify(appData));
    showNotification('Datos guardados correctamente', 'success');
    
    // Actualizar filtros dinámicos
    updateDynamicFilters();
}

// Actualizar filtros dinámicos
function updateDynamicFilters() {
    // Actualizar filtros de rareza para objetos
    updateRarityFilters('item', appData.items);
    
    // Actualizar filtros de rareza y tipo para armas
    updateRarityFilters('weapon', appData.weapons);
    updateTypeFilters('weapon', appData.weapons);
    
    // Actualizar filtros de tipo para monstruos
    updateTypeFilters('monster', appData.monsters);
}

// Actualizar filtros de rareza
function updateRarityFilters(type, data) {
    const container = document.getElementById(`${type}-rarity-filters`);
    if (!container) return;
    
    const rarities = [...new Set(data.map(item => item.rarity))].filter(r => r);
    
    container.innerHTML = '';
    rarities.forEach(rarity => {
        const filterTag = document.createElement('span');
        filterTag.className = 'filter-tag';
        filterTag.textContent = rarity;
        filterTag.dataset.filter = rarity;
        filterTag.addEventListener('click', () => {
            filterTag.classList.toggle('active');
            if (type === 'item') filterItems();
            else if (type === 'weapon') filterWeapons();
        });
        container.appendChild(filterTag);
    });
}

// Actualizar filtros de tipo
function updateTypeFilters(type, data) {
    const container = document.getElementById(`${type}-type-filters`);
    if (!container) return;
    
    const types = [...new Set(data.map(item => item.type))].filter(t => t);
    
    container.innerHTML = '';
    types.forEach(itemType => {
        const filterTag = document.createElement('span');
        filterTag.className = 'filter-tag';
        filterTag.textContent = itemType;
        filterTag.dataset.filter = itemType;
        filterTag.addEventListener('click', () => {
            filterTag.classList.toggle('active');
            if (type === 'weapon') filterWeapons();
            else if (type === 'monster') filterMonsters();
        });
        container.appendChild(filterTag);
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Navegación
    DOM.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            showSection(section);
            closeSidebar(); // Cerrar menú al seleccionar
        });
    });

    // Dashboard cards
    DOM.dashboardCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const section = card.getAttribute('data-section');
            showSection(section);
        });
    });

    // Menú móvil
    DOM.menuToggle.addEventListener('click', openSidebar);
    DOM.closeSidebar.addEventListener('click', closeSidebar);
    DOM.overlay.addEventListener('click', closeSidebar);

    // Gestos táctiles para el menú
    setupTouchEvents();

    // Formularios
    document.getElementById('item-form').addEventListener('submit', handleItemSubmit);
    document.getElementById('weapon-form').addEventListener('submit', handleWeaponSubmit);
    document.getElementById('monster-form').addEventListener('submit', handleMonsterSubmit);
    document.getElementById('reset-monster').addEventListener('click', resetMonsterForm);

    // Botones de cancelar edición
    document.getElementById('cancel-edit-item').addEventListener('click', cancelEditItem);
    document.getElementById('cancel-edit-weapon').addEventListener('click', cancelEditWeapon);
    document.getElementById('cancel-edit-monster').addEventListener('click', cancelEditMonster);

    // Sistema de dropeo
    document.getElementById('add-drop').addEventListener('click', addDropItem);
    document.getElementById('simulate-drop').addEventListener('click', simulateDrop);

    // Exportación
    document.getElementById('export-type').addEventListener('change', updateExportOptions);
    document.getElementById('export-item').addEventListener('change', updateExportText);
    document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
    document.getElementById('clear-all-btn').addEventListener('click', clearAllData);

    // Búsqueda
    document.getElementById('search-items').addEventListener('input', filterItems);
    document.getElementById('search-weapons').addEventListener('input', filterWeapons);
    document.getElementById('search-monsters').addEventListener('input', filterMonsters);
    
    // Limpiar búsqueda
    document.getElementById('clear-search-items').addEventListener('click', () => {
        document.getElementById('search-items').value = '';
        filterItems();
    });
    document.getElementById('clear-search-weapons').addEventListener('click', () => {
        document.getElementById('search-weapons').value = '';
        filterWeapons();
    });
    document.getElementById('clear-search-monsters').addEventListener('click', () => {
        document.getElementById('search-monsters').value = '';
        filterMonsters();
    });

    // Eliminar drops
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-drop') || e.target.closest('.remove-drop')) {
            const dropItem = e.target.closest('.drop-item');
            if (dropItem) {
                dropItem.remove();
            }
        }
    });

    // Manejo de imágenes
    document.getElementById('item-image').addEventListener('change', handleImageUpload.bind(null, 'item'));
    document.getElementById('weapon-image').addEventListener('change', handleImageUpload.bind(null, 'weapon'));
    document.getElementById('monster-image').addEventListener('change', handleImageUpload.bind(null, 'monster'));
}

// Configurar eventos táctiles
function setupTouchEvents() {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        
        // Mostrar indicador si estamos cerca del borde izquierdo
        if (startX < 50 && currentX > startX) {
            DOM.dragIndicator.style.display = 'block';
        }
    });

    document.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        
        const diff = currentX - startX;
        
        // Si el deslizamiento es significativo y hacia la derecha, abrir menú
        if (diff > 100 && startX < 50) {
            openSidebar();
        }
        
        isDragging = false;
        DOM.dragIndicator.style.display = 'none';
    });
}

// Mostrar/ocultar menú lateral
function openSidebar() {
    DOM.sidebar.classList.add('active');
    DOM.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    DOM.sidebar.classList.remove('active');
    DOM.overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Cambiar sección visible
function showSection(sectionId) {
    // Ocultar todas las secciones
    DOM.contentSections.forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar sección seleccionada
    document.getElementById(sectionId).classList.add('active');

    // Actualizar navegación activa
    DOM.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });

    // Renderizar contenido específico de la sección
    switch(sectionId) {
        case 'items':
            renderItems();
            break;
        case 'weapons':
            renderWeapons();
            break;
        case 'monsters':
            renderMonsters();
            break;
        case 'dashboard':
            renderDashboard();
            break;
    }
}

// Renderizar dashboard
function renderDashboard() {
    // Actualizar estadísticas
    document.getElementById('items-count').textContent = appData.items.length;
    document.getElementById('weapons-count').textContent = appData.weapons.length;
    document.getElementById('monsters-count').textContent = appData.monsters.length;

    // Renderizar actividades recientes
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '';

    if (appData.activities.length === 0) {
        activityList.innerHTML = '<div class="empty-state"><p>No hay actividad reciente</p></div>';
        return;
    }

    appData.activities.slice(0, 5).forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        let icon = '';
        switch(activity.type) {
            case 'item':
                icon = 'fas fa-cube';
                break;
            case 'weapon':
                icon = 'fas fa-gavel';
                break;
            case 'monster':
                icon = 'fas fa-pastafarianism';
                break;
        }

        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="${icon}"></i>
            </div>
            <div class="activity-details">
                <p>Creaste ${activity.type === 'item' ? 'el objeto' : activity.type === 'weapon' ? 'el arma' : 'el monstruo'} <strong>${activity.name}</strong></p>
                <span class="activity-time">${activity.time}</span>
            </div>
        `;
        
        activityList.appendChild(activityItem);
    });
}

// Manejar envío de formulario de objetos
function handleItemSubmit(e) {
    e.preventDefault();
    
    const imageFile = document.getElementById('item-image').files[0];
    
    if (imageFile) {
        // Si hay una imagen, procesarla
        const reader = new FileReader();
        reader.onload = function(event) {
            saveItem(event.target.result);
        };
        reader.readAsDataURL(imageFile);
    } else {
        // Si no hay imagen, mantener la existente si estamos editando
        const existingItem = editingItemId ? appData.items.find(item => item.id === editingItemId) : null;
        saveItem(existingItem ? existingItem.image : '');
    }
    
    function saveItem(imageData) {
        const itemData = {
            id: editingItemId || Date.now(),
            name: document.getElementById('item-name').value,
            type: document.getElementById('item-type').value,
            description: document.getElementById('item-description').value,
            image: imageData,
            effect: document.getElementById('item-effect').value,
            value: parseInt(document.getElementById('item-value').value) || 0,
            weight: parseFloat(document.getElementById('item-weight').value) || 0,
            rarity: document.getElementById('item-rarity').value
        };
        
        // Validación básica
        if (!itemData.name || !itemData.description) {
            showNotification('Por favor, completa al menos el nombre y la descripción', 'error');
            return;
        }
        
        if (editingItemId) {
            // Actualizar objeto existente
            const index = appData.items.findIndex(item => item.id === editingItemId);
            if (index !== -1) {
                appData.items[index] = itemData;
                showNotification(`Objeto "${itemData.name}" actualizado exitosamente`, 'success');
            }
            cancelEditItem();
        } else {
            // Crear nuevo objeto
            appData.items.push(itemData);
            appData.activities.unshift({
                type: 'item',
                name: itemData.name,
                time: 'Hace unos momentos'
            });
            showNotification(`Objeto "${itemData.name}" creado exitosamente`, 'success');
        }
        
        saveData();
        renderItems();
        renderDashboard();
        updateExportOptions();
        e.target.reset();
        document.getElementById('item-image-preview').classList.remove('show');
    }
}

// Manejar envío de formulario de armas
function handleWeaponSubmit(e) {
    e.preventDefault();
    
    const imageFile = document.getElementById('weapon-image').files[0];
    
    if (imageFile) {
        // Si hay una imagen, procesarla
        const reader = new FileReader();
        reader.onload = function(event) {
            saveWeapon(event.target.result);
        };
        reader.readAsDataURL(imageFile);
    } else {
        // Si no hay imagen, mantener la existente si estamos editando
        const existingWeapon = editingWeaponId ? appData.weapons.find(weapon => weapon.id === editingWeaponId) : null;
        saveWeapon(existingWeapon ? existingWeapon.image : '');
    }
    
    function saveWeapon(imageData) {
        const weaponData = {
            id: editingWeaponId || Date.now(),
            name: document.getElementById('weapon-name').value,
            type: document.getElementById('weapon-type').value,
            description: document.getElementById('weapon-description').value,
            image: imageData,
            damage: document.getElementById('weapon-damage').value,
            bonus: parseInt(document.getElementById('weapon-bonus').value) || 0,
            crit: document.getElementById('weapon-crit').value,
            special: document.getElementById('weapon-special').value,
            rarity: document.getElementById('weapon-rarity').value
        };
        
        // Validación básica
        if (!weaponData.name || !weaponData.description) {
            showNotification('Por favor, completa al menos el nombre y la descripción', 'error');
            return;
        }
        
        if (editingWeaponId) {
            // Actualizar arma existente
            const index = appData.weapons.findIndex(weapon => weapon.id === editingWeaponId);
            if (index !== -1) {
                appData.weapons[index] = weaponData;
                showNotification(`Arma "${weaponData.name}" actualizada exitosamente`, 'success');
            }
            cancelEditWeapon();
        } else {
            // Crear nueva arma
            appData.weapons.push(weaponData);
            appData.activities.unshift({
                type: 'weapon',
                name: weaponData.name,
                time: 'Hace unos momentos'
            });
            showNotification(`Arma "${weaponData.name}" creada exitosamente`, 'success');
        }
        
        saveData();
        renderWeapons();
        renderDashboard();
        updateExportOptions();
        e.target.reset();
        document.getElementById('weapon-image-preview').classList.remove('show');
    }
}

// Manejar envío de formulario de monstruos
function handleMonsterSubmit(e) {
    e.preventDefault();
    
    const imageFile = document.getElementById('monster-image').files[0];
    
    if (imageFile) {
        // Si hay una imagen, procesarla
        const reader = new FileReader();
        reader.onload = function(event) {
            saveMonster(event.target.result);
        };
        reader.readAsDataURL(imageFile);
    } else {
        // Si no hay imagen, mantener la existente si estamos editando
        const existingMonster = editingMonsterId ? appData.monsters.find(monster => monster.id === editingMonsterId) : null;
        saveMonster(existingMonster ? existingMonster.image : '');
    }
    
    function saveMonster(imageData) {
        // Recoger datos de drops
        const dropItems = document.querySelectorAll('.drop-item');
        const drops = [];
        
        dropItems.forEach(drop => {
            const itemSelect = drop.querySelector('select');
            const chanceInput = drop.querySelector('.drop-chance input');
            const quantityInput = drop.querySelector('.drop-quantity input');
            
            if (itemSelect.value && chanceInput.value) {
                drops.push({
                    item: itemSelect.value,
                    chance: parseInt(chanceInput.value),
                    quantity: quantityInput.value
                });
            }
        });
        
        const monsterData = {
            id: editingMonsterId || Date.now(),
            name: document.getElementById('monster-name').value,
            type: document.getElementById('monster-type').value,
            description: document.getElementById('monster-description').value,
            image: imageData,
            level: parseInt(document.getElementById('monster-level').value) || 1,
            hp: parseInt(document.getElementById('monster-hp').value) || 1,
            ac: parseInt(document.getElementById('monster-ac').value) || 10,
            attack: document.getElementById('monster-attack').value,
            xp: parseInt(document.getElementById('monster-xp').value) || 0,
            str: parseInt(document.getElementById('monster-str').value) || 10,
            dex: parseInt(document.getElementById('monster-dex').value) || 10,
            con: parseInt(document.getElementById('monster-con').value) || 10,
            int: parseInt(document.getElementById('monster-int').value) || 10,
            wis: parseInt(document.getElementById('monster-wis').value) || 10,
            cha: parseInt(document.getElementById('monster-cha').value) || 10,
            abilities: document.getElementById('monster-abilities').value,
            drops: drops
        };
        
        // Validación básica
        if (!monsterData.name || !monsterData.description) {
            showNotification('Por favor, completa al menos el nombre y la descripción', 'error');
            return;
        }
        
        if (editingMonsterId) {
            // Actualizar monstruo existente
            const index = appData.monsters.findIndex(monster => monster.id === editingMonsterId);
            if (index !== -1) {
                appData.monsters[index] = monsterData;
                showNotification(`Monstruo "${monsterData.name}" actualizado exitosamente`, 'success');
            }
            cancelEditMonster();
        } else {
            // Crear nuevo monstruo
            appData.monsters.push(monsterData);
            appData.activities.unshift({
                type: 'monster',
                name: monsterData.name,
                time: 'Hace unos momentos'
            });
            showNotification(`Monstruo "${monsterData.name}" creado exitosamente`, 'success');
        }
        
        saveData();
        renderMonsters();
        renderDashboard();
        updateExportOptions();
        document.getElementById('monster-image-preview').classList.remove('show');
    }
}

// Cancelar edición de objeto
function cancelEditItem() {
    editingItemId = null;
    document.getElementById('item-form').reset();
    document.getElementById('item-form-title').textContent = 'Crear Nuevo Objeto';
    document.getElementById('item-submit-text').textContent = 'Guardar Objeto';
    document.getElementById('cancel-edit-item').style.display = 'none';
    document.getElementById('item-image-preview').classList.remove('show');
}

// Cancelar edición de arma
function cancelEditWeapon() {
    editingWeaponId = null;
    document.getElementById('weapon-form').reset();
    document.getElementById('weapon-form-title').textContent = 'Crear Nueva Arma';
    document.getElementById('weapon-submit-text').textContent = 'Guardar Arma';
    document.getElementById('cancel-edit-weapon').style.display = 'none';
    document.getElementById('weapon-image-preview').classList.remove('show');
}

// Cancelar edición de monstruo
function cancelEditMonster() {
    editingMonsterId = null;
    document.getElementById('monster-form').reset();
    document.getElementById('monster-form-title').textContent = 'Crear Nuevo Monstruo';
    document.getElementById('monster-submit-text').textContent = 'Guardar Monstruo';
    document.getElementById('cancel-edit-monster').style.display = 'none';
    document.getElementById('monster-image-preview').classList.remove('show');
    document.getElementById('drops-container').innerHTML = '';
    addDropItem();
}

// Editar objeto
function editItem(id) {
    const item = appData.items.find(item => item.id === id);
    if (!item) return;
    
    // Cargar datos en el formulario
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-type').value = item.type;
    document.getElementById('item-description').value = item.description;
    document.getElementById('item-effect').value = item.effect;
    document.getElementById('item-value').value = item.value;
    document.getElementById('item-weight').value = item.weight;
    document.getElementById('item-rarity').value = item.rarity;
    
    if (item.image) {
        document.getElementById('item-image-preview').src = item.image;
        document.getElementById('item-image-preview').classList.add('show');
    }
    
    editingItemId = id;
    
    // Cambiar interfaz para edición
    document.getElementById('item-form-title').textContent = 'Editar Objeto';
    document.getElementById('item-submit-text').textContent = 'Actualizar Objeto';
    document.getElementById('cancel-edit-item').style.display = 'inline-flex';
    
    // Desplazar al formulario
    document.getElementById('item-form').scrollIntoView({ behavior: 'smooth' });
}

// Editar arma
function editWeapon(id) {
    const weapon = appData.weapons.find(weapon => weapon.id === id);
    if (!weapon) return;
    
    // Cargar datos en el formulario
    document.getElementById('weapon-name').value = weapon.name;
    document.getElementById('weapon-type').value = weapon.type;
    document.getElementById('weapon-description').value = weapon.description;
    document.getElementById('weapon-damage').value = weapon.damage;
    document.getElementById('weapon-bonus').value = weapon.bonus;
    document.getElementById('weapon-crit').value = weapon.crit;
    document.getElementById('weapon-special').value = weapon.special;
    document.getElementById('weapon-rarity').value = weapon.rarity;
    
    if (weapon.image) {
        document.getElementById('weapon-image-preview').src = weapon.image;
        document.getElementById('weapon-image-preview').classList.add('show');
    }
    
    editingWeaponId = id;
    
    // Cambiar interfaz para edición
    document.getElementById('weapon-form-title').textContent = 'Editar Arma';
    document.getElementById('weapon-submit-text').textContent = 'Actualizar Arma';
    document.getElementById('cancel-edit-weapon').style.display = 'inline-flex';
    
    // Desplazar al formulario
    document.getElementById('weapon-form').scrollIntoView({ behavior: 'smooth' });
}

// Editar monstruo
function editMonster(id) {
    const monster = appData.monsters.find(monster => monster.id === id);
    if (!monster) return;
    
    // Cargar datos en el formulario
    document.getElementById('monster-name').value = monster.name;
    document.getElementById('monster-type').value = monster.type;
    document.getElementById('monster-description').value = monster.description;
    document.getElementById('monster-level').value = monster.level;
    document.getElementById('monster-hp').value = monster.hp;
    document.getElementById('monster-ac').value = monster.ac;
    document.getElementById('monster-attack').value = monster.attack;
    document.getElementById('monster-xp').value = monster.xp;
    document.getElementById('monster-str').value = monster.str;
    document.getElementById('monster-dex').value = monster.dex;
    document.getElementById('monster-con').value = monster.con;
    document.getElementById('monster-int').value = monster.int;
    document.getElementById('monster-wis').value = monster.wis;
    document.getElementById('monster-cha').value = monster.cha;
    document.getElementById('monster-abilities').value = monster.abilities;
    
    if (monster.image) {
        document.getElementById('monster-image-preview').src = monster.image;
        document.getElementById('monster-image-preview').classList.add('show');
    }
    
    // Cargar drops
    document.getElementById('drops-container').innerHTML = '';
    if (monster.drops && monster.drops.length > 0) {
        monster.drops.forEach(drop => {
            addDropItem(drop);
        });
    } else {
        addDropItem();
    }
    
    editingMonsterId = id;
    
    // Cambiar interfaz para edición
    document.getElementById('monster-form-title').textContent = 'Editar Monstruo';
    document.getElementById('monster-submit-text').textContent = 'Actualizar Monstruo';
    document.getElementById('cancel-edit-monster').style.display = 'inline-flex';
    
    // Desplazar al formulario
    document.getElementById('monster-form').scrollIntoView({ behavior: 'smooth' });
}

// Resetear formulario de monstruos
function resetMonsterForm() {
    document.getElementById('monster-form').reset();
    document.getElementById('drops-container').innerHTML = '';
    addDropItem();
    document.getElementById('monster-image-preview').classList.remove('show');
    showNotification('Formulario reiniciado', 'info');
}

// Añadir campo de drop
function addDropItem(dropData = null) {
    const dropsContainer = document.getElementById('drops-container');
    const dropItem = document.createElement('div');
    dropItem.className = 'drop-item';
    
    // Obtener opciones de objetos y armas
    let itemOptions = '<option value="">Seleccionar objeto</option>';
    appData.items.forEach(item => {
        itemOptions += `<option value="${item.name}" ${dropData && dropData.item === item.name ? 'selected' : ''}>${item.name}</option>`;
    });
    appData.weapons.forEach(weapon => {
        itemOptions += `<option value="${weapon.name}" ${dropData && dropData.item === weapon.name ? 'selected' : ''}>${weapon.name}</option>`;
    });
    
    dropItem.innerHTML = `
        <div class="drop-select">
            <label>Objeto</label>
            <select class="form-input">
                ${itemOptions}
            </select>
        </div>
        <div class="drop-chance">
            <label>Probabilidad (%)</label>
            <input type="number" class="form-input" min="1" max="100" value="${dropData ? dropData.chance : 10}">
        </div>
        <div class="drop-quantity">
            <label>Cantidad</label>
            <input type="text" class="form-input" value="${dropData ? dropData.quantity : '1'}" placeholder="1 o 1d4">
        </div>
        <button type="button" class="btn btn-danger btn-sm remove-drop">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    dropsContainer.appendChild(dropItem);
}

// Simular dropeo con múltiples tiradas
function simulateDrop() {
    const dropsContainer = document.getElementById('drops-container');
    const dropItems = dropsContainer.querySelectorAll('.drop-item');
    const dropResult = document.getElementById('drop-result');
    const numRolls = parseInt(document.getElementById('drop-rolls').value) || 1;
    
    if (dropItems.length === 0) {
        dropResult.innerHTML = '<p>No hay drops configurados</p>';
        return;
    }
    
    let obtainedDrops = [];
    
    // Realizar múltiples tiradas
    for (let roll = 0; roll < numRolls; roll++) {
        dropItems.forEach(drop => {
            const itemSelect = drop.querySelector('select');
            const chanceInput = drop.querySelector('.drop-chance input');
            const quantityInput = drop.querySelector('.drop-quantity input');
            
            if (itemSelect.value) {
                const chance = parseInt(chanceInput.value);
                // Realizar tirada para este objeto
                const rollValue = Math.random() * 100;
                if (rollValue <= chance) {
                    // Calcular cantidad si es una expresión de dados
                    let quantity = quantityInput.value;
                    if (quantity.includes('d')) {
                        const [numDice, diceSides] = quantity.split('d').map(Number);
                        let total = 0;
                        for (let i = 0; i < numDice; i++) {
                            total += Math.floor(Math.random() * diceSides) + 1;
                        }
                        quantity = total;
                    } else {
                        quantity = parseInt(quantity) || 1;
                    }
                    
                    // Buscar si ya existe este objeto en los drops obtenidos
                    const existingDrop = obtainedDrops.find(d => d.item === itemSelect.value);
                    if (existingDrop) {
                        existingDrop.quantity += parseInt(quantity);
                    } else {
                        obtainedDrops.push({
                            item: itemSelect.value,
                            quantity: parseInt(quantity)
                        });
                    }
                }
            }
        });
    }
    
    // Mostrar resultado
    if (obtainedDrops.length > 0) {
        let resultHTML = `
            <div class="drop-success">
                <i class="fas fa-treasure-chest"></i>
                <h4>¡Has obtenido drops!</h4>
        `;
        obtainedDrops.forEach(drop => {
            resultHTML += `<p><strong>${drop.item}</strong> x${drop.quantity}</p>`;
        });
        resultHTML += `</div>`;
        dropResult.innerHTML = resultHTML;
    } else {
        dropResult.innerHTML = `
            <div class="drop-fail">
                <i class="fas fa-times-circle"></i>
                <h4>No has obtenido ningún drop</h4>
                <p>Mejor suerte la próxima vez</p>
            </div>
        `;
    }
}

// Renderizar objetos en tabla compacta
function renderItems() {
    const itemsList = document.getElementById('items-list');
    
    if (appData.items.length === 0) {
        itemsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-cube"></i>
                </div>
                <h4>No hay objetos creados</h4>
                <p>Crea tu primer objeto usando el formulario</p>
            </div>
        `;
        return;
    }
    
    // Aplicar filtros
    const searchTerm = document.getElementById('search-items').value.toLowerCase();
    const activeRarities = getActiveFilters('item-rarity-filters');
    
    const filteredItems = appData.items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) || 
                             item.description.toLowerCase().includes(searchTerm) ||
                             item.type.toLowerCase().includes(searchTerm);
        const matchesRarity = activeRarities.length === 0 || activeRarities.includes(item.rarity);
        
        return matchesSearch && matchesRarity;
    });
    
    if (filteredItems.length === 0) {
        itemsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h4>No se encontraron objetos</h4>
                <p>Prueba con otros términos de búsqueda o ajusta los filtros</p>
            </div>
        `;
        return;
    }
    
    // Crear tabla compacta
    let tableHTML = `
        <table class="compact-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Rareza</th>
                    <th>Valor</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredItems.forEach(item => {
        tableHTML += `
            <tr data-id="${item.id}">
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.rarity}</td>
                <td>${item.value} monedas</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline btn-sm edit-item" data-id="${item.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm delete-item" data-id="${item.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    itemsList.innerHTML = tableHTML;
    
    // Añadir event listeners para eliminar y editar
    document.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.delete-item').getAttribute('data-id'));
            deleteItem(id);
        });
    });
    
    document.querySelectorAll('.edit-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.edit-item').getAttribute('data-id'));
            editItem(id);
        });
    });
}

// Renderizar armas en tabla compacta
function renderWeapons() {
    const weaponsList = document.getElementById('weapons-list');
    
    if (appData.weapons.length === 0) {
        weaponsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-gavel"></i>
                </div>
                <h4>No hay armas creadas</h4>
                <p>Crea tu primera arma usando el formulario</p>
            </div>
        `;
        return;
    }
    
    // Aplicar filtros
    const searchTerm = document.getElementById('search-weapons').value.toLowerCase();
    const activeRarities = getActiveFilters('weapon-rarity-filters');
    const activeTypes = getActiveFilters('weapon-type-filters');
    
    const filteredWeapons = appData.weapons.filter(weapon => {
        const matchesSearch = weapon.name.toLowerCase().includes(searchTerm) || 
                             weapon.description.toLowerCase().includes(searchTerm) ||
                             weapon.type.toLowerCase().includes(searchTerm);
        const matchesRarity = activeRarities.length === 0 || activeRarities.includes(weapon.rarity);
        const matchesType = activeTypes.length === 0 || activeTypes.includes(weapon.type);
        
        return matchesSearch && matchesRarity && matchesType;
    });
    
    if (filteredWeapons.length === 0) {
        weaponsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h4>No se encontraron armas</h4>
                <p>Prueba con otros términos de búsqueda o ajusta los filtros</p>
            </div>
        `;
        return;
    }
    
    // Crear tabla compacta
    let tableHTML = `
        <table class="compact-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Daño</th>
                    <th>Rareza</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredWeapons.forEach(weapon => {
        tableHTML += `
            <tr data-id="${weapon.id}">
                <td>${weapon.name}</td>
                <td>${weapon.type}</td>
                <td>${weapon.damage}</td>
                <td>${weapon.rarity}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline btn-sm edit-weapon" data-id="${weapon.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm delete-weapon" data-id="${weapon.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    weaponsList.innerHTML = tableHTML;
    
    // Añadir event listeners para eliminar y editar
    document.querySelectorAll('.delete-weapon').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.delete-weapon').getAttribute('data-id'));
            deleteWeapon(id);
        });
    });
    
    document.querySelectorAll('.edit-weapon').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.edit-weapon').getAttribute('data-id'));
            editWeapon(id);
        });
    });
}

// Renderizar monstruos en tabla compacta
function renderMonsters() {
    const monstersList = document.getElementById('monsters-list');
    
    if (appData.monsters.length === 0) {
        monstersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-pastafarianism"></i>
                </div>
                <h4>No hay monstruos creados</h4>
                <p>Crea tu primer monstruo usando el formulario</p>
            </div>
        `;
        return;
    }
    
    // Aplicar filtros
    const searchTerm = document.getElementById('search-monsters').value.toLowerCase();
    const activeTypes = getActiveFilters('monster-type-filters');
    
    const filteredMonsters = appData.monsters.filter(monster => {
        const matchesSearch = monster.name.toLowerCase().includes(searchTerm) || 
                             monster.description.toLowerCase().includes(searchTerm);
        const matchesType = activeTypes.length === 0 || activeTypes.includes(monster.type);
        
        return matchesSearch && matchesType;
    });
    
    if (filteredMonsters.length === 0) {
        monstersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h4>No se encontraron monstruos</h4>
                <p>Prueba con otros términos de búsqueda o ajusta los filtros</p>
            </div>
        `;
        return;
    }
    
    // Crear tabla compacta
    let tableHTML = `
        <table class="compact-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Nivel</th>
                    <th>PV</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredMonsters.forEach(monster => {
        tableHTML += `
            <tr data-id="${monster.id}">
                <td>${monster.name}</td>
                <td>${monster.type}</td>
                <td>${monster.level}</td>
                <td>${monster.hp}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline btn-sm edit-monster" data-id="${monster.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm delete-monster" data-id="${monster.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    monstersList.innerHTML = tableHTML;
    
    // Añadir event listeners para eliminar y editar
    document.querySelectorAll('.delete-monster').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.delete-monster').getAttribute('data-id'));
            deleteMonster(id);
        });
    });
    
    document.querySelectorAll('.edit-monster').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.edit-monster').getAttribute('data-id'));
            editMonster(id);
        });
    });
}

// Obtener filtros activos
function getActiveFilters(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    const activeFilters = [];
    container.querySelectorAll('.filter-tag.active').forEach(tag => {
        activeFilters.push(tag.dataset.filter);
    });
    
    return activeFilters;
}

// Eliminar elementos
function deleteItem(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este objeto?')) {
        appData.items = appData.items.filter(item => item.id !== id);
        saveData();
        renderItems();
        updateExportOptions();
        showNotification('Objeto eliminado', 'info');
    }
}

function deleteWeapon(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta arma?')) {
        appData.weapons = appData.weapons.filter(weapon => weapon.id !== id);
        saveData();
        renderWeapons();
        updateExportOptions();
        showNotification('Arma eliminada', 'info');
    }
}

function deleteMonster(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este monstruo?')) {
        appData.monsters = appData.monsters.filter(monster => monster.id !== id);
        saveData();
        renderMonsters();
        updateExportOptions();
        showNotification('Monstruo eliminado', 'info');
    }
}

// Funciones de búsqueda y filtrado
function filterItems() {
    renderItems();
}

function filterWeapons() {
    renderWeapons();
}

function filterMonsters() {
    renderMonsters();
}

// Manejo de imágenes
function handleImageUpload(type, event) {
    const file = event.target.files[0];
    const previewId = `${type}-image-preview`;
    const preview = document.getElementById(previewId);
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.add('show');
        };
        reader.readAsDataURL(file);
    } else {
        preview.classList.remove('show');
    }
}

// Actualizar opciones de exportación
function updateExportOptions() {
    const type = document.getElementById('export-type').value;
    const select = document.getElementById('export-item');
    
    select.innerHTML = '<option value="">Selecciona un elemento</option>';
    
    let data = [];
    if (type === 'items') data = appData.items;
    else if (type === 'weapons') data = appData.weapons;
    else if (type === 'monsters') data = appData.monsters;
    
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        select.appendChild(option);
    });
    
    updateExportText();
}

// Actualizar texto de exportación
function updateExportText() {
    const type = document.getElementById('export-type').value;
    const id = parseInt(document.getElementById('export-item').value);
    const textArea = document.getElementById('export-text');
    
    if (!id) {
        textArea.innerHTML = '<p>Selecciona un elemento para ver su formato de exportación.</p>';
        return;
    }
    
    let item;
    if (type === 'items') item = appData.items.find(i => i.id === id);
    else if (type === 'weapons') item = appData.weapons.find(w => w.id === id);
    else if (type === 'monsters') item = appData.monsters.find(m => m.id === id);
    
    if (!item) {
        textArea.innerHTML = '<p>Elemento no encontrado.</p>';
        return;
    }
    
    // Formatear para WhatsApp
    let formattedText = `*${item.name}*\n\n`;
    
    if (item.description) formattedText += `${item.description}\n\n`;
    
    if (type === 'items') {
        if (item.type) formattedText += `*Tipo:* ${item.type}\n`;
        if (item.effect) formattedText += `*Efecto:* ${item.effect}\n`;
        if (item.value) formattedText += `*Valor:* ${item.value} monedas\n`;
        if (item.weight) formattedText += `*Peso:* ${item.weight} kg\n`;
        if (item.rarity) formattedText += `*Rareza:* ${item.rarity}\n`;
    }
    else if (type === 'weapons') {
        if (item.damage) formattedText += `*Daño:* ${item.damage}\n`;
        if (item.type) formattedText += `*Tipo:* ${item.type}\n`;
        if (item.bonus) formattedText += `*Bonificación:* +${item.bonus}\n`;
        if (item.crit) formattedText += `*Crítico:* ${item.crit}\n`;
        if (item.rarity) formattedText += `*Rareza:* ${item.rarity}\n`;
        if (item.special) formattedText += `*Efectos especiales:* ${item.special}\n`;
    }
    else if (type === 'monsters') {
        if (item.type) formattedText += `*Tipo:* ${item.type}\n`;
        if (item.level) formattedText += `*Nivel:* ${item.level}\n`;
        if (item.hp) formattedText += `*PV:* ${item.hp}\n`;
        if (item.ac) formattedText += `*Armadura:* ${item.ac}\n`;
        if (item.attack) formattedText += `*Ataque:* ${item.attack}\n`;
        if (item.xp) formattedText += `*Experiencia:* ${item.xp} XP\n`;
        
        formattedText += `\n*Atributos:*\n`;
        formattedText += `FUE:${item.str} DES:${item.dex} CON:${item.con}\n`;
        formattedText += `INT:${item.int} SAB:${item.wis} CAR:${item.cha}\n`;
        
        if (item.abilities) formattedText += `\n*Habilidades:* ${item.abilities}\n`;
        
        if (item.drops && item.drops.length > 0) {
            formattedText += `\n*Drops:*\n`;
            item.drops.forEach(drop => {
                formattedText += `• ${drop.item} (${drop.chance}%) x${drop.quantity}\n`;
            });
        }
    }
    
    textArea.innerHTML = `<pre>${formattedText}</pre>`;
}

// Copiar al portapapeles
function copyToClipboard() {
    const textArea = document.getElementById('export-text');
    const text = textArea.textContent || textArea.innerText;
    
    if (!text || text.includes('Selecciona un elemento')) {
        showNotification('No hay texto para copiar', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(text)
        .then(() => {
            showNotification('Texto copiado al portapapeles', 'success');
        })
        .catch(err => {
            console.error('Error al copiar: ', err);
            showNotification('Error al copiar el texto', 'error');
        });
}

// Limpiar todos los datos
function clearAllData() {
    if (confirm('¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('wikiRolData');
        appData = {
            items: [],
            weapons: [],
            monsters: [],
            activities: []
        };
        
        saveData();
        renderItems();
        renderWeapons();
        renderMonsters();
        renderDashboard();
        updateExportOptions();
        
        showNotification('Todos los datos han sido eliminados', 'info');
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar notificación
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Ocultar después de 4 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 4000);
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);

