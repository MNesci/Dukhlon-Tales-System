// Handlebars
Handlebars.registerHelper('sortItemsByName', function (arrayToSort) {
    return arrayToSort.sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
});


// Actor Sheet

class DukhlonActorSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          classes: ["worldbuilding", "sheet", "actor"],
          template: "systems/worldbuilding/templates/actor-sheet.html",
          width: 610,
          height: 700,
          tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
        });
    };

    getData() {
        const context = super.getData();
        context.systemData = context.data.data;

        // Items
        const cards = [];
        const features = [];
        const globalActions = [];
        const weapons = [];
        
        for (let item of context.items) {
            if (item.type === 'feature') {
                cards.push(item);
            };
            if (item.type === 'feature') {
                features.push(item);
            };
            if (item.type === 'feature') {
                globalActions.push(item);
            };
            if (item.type === 'weapon') {
                weapons.push(item);
            };
        };
        context.cards = cards;
        context.features = features;
        context.globalActions = globalActions;
        context.weapons = weapons;
        return context;
    };
    
    activateListeners(html) {
        super.activateListeners(html);
        let actorData = this.actor.data;
        
        // Non-button functions
        this.countCardsInDeck();

        // lock buttons for non-owners
        if (!this.hasUserActorPerms(this.actor)) {
            return;
        };
        // buttons
        let skills = document.querySelectorAll('.skillRoll');
        skills.forEach((skill) => skill.addEventListener('click', (event) => {
            SkillRollBox.instance.renderRollBox(actorData.name, event.target.innerText, actorData.data.skills[event.target.innerText.toLowerCase()].value);
        }));

        let toggleLockButton = document.querySelector('.toggleLockButton');
        toggleLockButton.addEventListener('click', () => this.toggleLock());

        let sendDecklistToChatButton = document.querySelector('.sendDecklistToChatButton');
        if (sendDecklistToChatButton) {
            sendDecklistToChatButton.addEventListener('click', () => this.sendDecklistToChat());
        };

        let deleteRepertoireButton = document.querySelector('.deleteRepertoireButton');
        if (deleteRepertoireButton) {
            deleteRepertoireButton.addEventListener('click', () => this.deleteRepertoire());
        };

        let repertoireToggleInDeckButtons = document.querySelectorAll('.repertoireToggleInDeckButton');
        if (repertoireToggleInDeckButtons) {
            repertoireToggleInDeckButtons.forEach((button) => button.addEventListener('click', (event) => this.toggleCardInCombatDeck(event)));
        };

        let deleteButtons = document.querySelectorAll('.deleteButton');
        if (deleteButtons) {
            deleteButtons.forEach((button) => button.addEventListener('click', (event) => this.deleteItemFromActor(event)));
        };

        let toggleEquippedWeaponButtons = document.querySelectorAll('.toggleEquipButton');
        if (toggleEquippedWeaponButtons) {
            toggleEquippedWeaponButtons.forEach((button) => button.addEventListener('click', (event) => this.toggleEquippedWeapon(event)));
        };

        let increaseDisarmedButtons = document.querySelectorAll('.increaseDisarmed');
        if (increaseDisarmedButtons) {
            increaseDisarmedButtons.forEach((button) => button.addEventListener('click', () => this.increaseDisarmed(event)));
        };

        let decreaseDisarmedButtons = document.querySelectorAll('.decreaseDisarmed');
        if (decreaseDisarmedButtons) {
            decreaseDisarmedButtons.forEach((button) => button.addEventListener('click', () => this.decreaseDisarmed(event)));
        };

        let drawCardButton = document.querySelector('.drawCardButton');
        drawCardButton.addEventListener('click', () => this.drawCards(1));

        let drawTwoCardsButton = document.querySelector('.drawTwoCardsButton');
        drawTwoCardsButton.addEventListener('click', () => this.drawCards(2));

        let drawThreeCardsButton = document.querySelector('.drawThreeCardsButton');
        drawThreeCardsButton.addEventListener('click', () => this.drawCards(3));

        let resetDeckButton = document.querySelector('.resetDeckButton');
        resetDeckButton.addEventListener('click', (event) => this.resetDeck(event));

        let discardCardButtons = document.querySelectorAll('.handDiscardCardButton');
        if (discardCardButtons) {
            discardCardButtons.forEach((button) => button.addEventListener('click', (event) => {
                let card = this.actor.items.get(event.target.parentElement.dataset.id);
                this.playOrDiscardMessage(card, 'discard', null);
                this.playCard(card, null);
                this.discardCard(card);
            }));
        };

        let playCardButtons = document.querySelectorAll('.handPlayCardButton');
        playCardButtons.forEach((button) => button.addEventListener('click', (event) => {
            this.getCardData(event);
        }));

        let toggleCardDetailButtons = document.querySelectorAll('.cardNameSection');
        toggleCardDetailButtons.forEach((button) => button.addEventListener('click', (event) => this.toggleCardDetail(event)));

        let seekCardButtons = document.querySelectorAll('.combatDeckSeekButton');
        if (seekCardButtons) {
            seekCardButtons.forEach((button) => button.addEventListener('click', (event) => this.seekCard(event)));
        };
    };

    static instantiate() {
        DukhlonActorSheet.instance = new DukhlonActorSheet();
    };

    // return boolean regarding user's permissions for actor
    hasUserActorPerms(actor) {
        let user = game.userId;
        let permissions = actor.data.permission;
        return permissions[user] == 3;
    };

    async toggleLock() {
        if (this.actor.data.data.lockOrUnlock === 'Unlocked') {
            await this.actor.update({'data.lockOrUnlock': 'Locked'});
        } else {
            await this.actor.update({'data.lockOrUnlock': 'Unlocked'});
        };
    };

    // set up to be called on render
    calculateCurrentLoad(html) {
        let sheetForms = html.form;
        let arrayOfLoads = [];
        for (let key in sheetForms) {
            if (!sheetForms[key]) {
                continue;
            };
            if (sheetForms[key].className === 'weaponLoadInput') {
                arrayOfLoads.push(sheetForms[key].value || sheetForms[key].innerText);
            };
        };
        let currentLoad = arrayOfLoads.reduce((total, load) => Number(load) + total, 0);
        let loadNumberTextBox = html._element[0].querySelector('.loadNumber');
        loadNumberTextBox.innerText = currentLoad;
        let loadObject = {
            0: 'None',
            1: 'Small',
            2: 'Small',
            3: 'Small',
            4: 'Medium',
            5: 'Medium',
            6: 'Large',
            7: 'Large',
            8: 'Large',
        };
        let displayedLoad = loadObject[currentLoad];
        if (!displayedLoad) {
            displayedLoad = 'Excessive';
        }
        for (let key in sheetForms) {
            if (!sheetForms[key]) {
                continue;
            };
            if (sheetForms[key].className === 'currentLoadDisplay') {
                sheetForms[key].innerText = displayedLoad;
            };
        };
    };

    // set up to be called on render
    calculateSkillDCs(html) {
        let sheet = html._element[0];
        let skills = sheet.querySelectorAll('.individualSkillSection');
        for (let i = 0; i < skills.length; i++) {
            let skill = skills[i];
            let skillChildren = skill.children;
            console.log(skillChildren);
            let skillValue = skillChildren[1].value;
            skillChildren[2].value = skillValue * 3;
            console.log(skillChildren);
        }
    };

    // set up to be called by Activate Listeners
    async sendDecklistToChat() {
        let cardsInDeck = this.actor.data.items._source.filter((card) => card.data.inCombatDeck).map((card) => card.name);
        let sortedCardsInDeck = cardsInDeck.sort((a, b) => a.localeCompare(b));
        let decklist = sortedCardsInDeck.join('<br>')
        const token = this.actor.token;
        const chatData = {
            user: game.user.data._id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: decklist,
            speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
        };
        return ChatMessage.create(chatData);
    };

    // set up to be called by Activate Listeners
    async deleteRepertoire() {
        if (!confirm(`Delete ${this.actor.name}'s entire Repertoire?`)) {
            return;
        };
        let repertoire = this.actor.data.items._source.filter((item => item.type === 'card'));
        for (let i = 0; i < repertoire.length; i++) {
            let cardId = repertoire[i]._id;
            let item = this.actor.items.get(cardId);
            await item.delete();
        };
    };

    // set up to be called by Activate Listeners
    async toggleCardInCombatDeck(event) {
        let cardId = event.target.parentElement.dataset.id;
        let currentlyInCombatDeck = this.actor.data.items._source.find((item) => item._id === cardId).data.inCombatDeck;
        let itemChange = [{_id: cardId, 'data.inCombatDeck': !currentlyInCombatDeck}];
        await this.actor.updateEmbeddedDocuments('Item', itemChange);
        let deckLocationReset = [{_id: cardId, 'data.currentLocation': 'deck'}];
        await this.actor.updateEmbeddedDocuments('Item', deckLocationReset);
    };

    // set up to be called by Activate Listeners
    async deleteItemFromActor(event) {
        let item = this.actor.items.get(event.target.parentElement.dataset.id);
        await item.delete();
    };

    // set up to be called by Activate Listeners
    async toggleEquippedWeapon(event) {
        let itemId = event.target.parentElement.parentElement.dataset.id;
        let item = this.actor.items.get(itemId);
        let currentEquippedStatus = item.data.data.conditions.equipped;
        let newEquippedStatus = currentEquippedStatus === 'equipped' ? 'unequipped' : 'equipped';
        let itemChange = [{_id: itemId, 'data.conditions.equipped': newEquippedStatus}];
        await this.actor.updateEmbeddedDocuments('Item', itemChange);
    }

    // set up to be called by Activate Listeners
    async increaseDisarmed(event) {
        let itemId = event.target.parentElement.parentElement.dataset.id;
        let item = this.actor.items.get(itemId);
        let currentDisarmed = item.data.data.conditions.disarmed;
        let newDisarmed = currentDisarmed + 1;
        let itemChange = [{_id: itemId, 'data.conditions.disarmed': newDisarmed}];
        await this.actor.updateEmbeddedDocuments('Item', itemChange);
    };

    // set up to be called by Activate Listeners
    async decreaseDisarmed(event) {
        let itemId = event.target.parentElement.parentElement.dataset.id;
        let item = this.actor.items.get(itemId);
        let currentDisarmed = item.data.data.conditions.disarmed;
        let newDisarmed = currentDisarmed - 1;
        let itemChange = [{_id: itemId, 'data.conditions.disarmed': newDisarmed}];
        await this.actor.updateEmbeddedDocuments('Item', itemChange);
    };

    // set up to be called by Activate Listeners
    async drawCards(numberOfCards) {
        let actorActiveCards = this.actor.items._source.filter(item => item.data.inCombatDeck);
        for (let i = 0; i < numberOfCards; i++) {
            let arrayOfCardsInDeck = actorActiveCards.filter((card) => card.data.currentLocation === 'deck');
            let indexToDrawFrom = Math.ceil(Math.random() * (arrayOfCardsInDeck.length)) - 1;
            let idOfDrawnCard = arrayOfCardsInDeck[indexToDrawFrom]._id;
            let itemChange = [{_id: idOfDrawnCard, 'data.currentLocation': 'hand'}];
            await this.actor.updateEmbeddedDocuments('Item', itemChange);    
        };
    };

    // set up to be called by Activate Listeners
    async resetDeck(event) {
        let arrayOfCardsFromDeck = this.actor.items._source.filter((item) => item.data.inCombatDeck && item.data.inCombatDeck !== 'deck');
        for (let card of arrayOfCardsFromDeck) {
            let itemChange = [{_id: card._id, 'data.currentLocation': 'deck'}];
            await this.actor.updateEmbeddedDocuments('Item', itemChange);
        };
    };

    getCardData(event) {
        let card = this.actor.items.get(event.target.parentElement.dataset.id);
        let heading = `Set X for ${card.name} ${card.system.tempoCost}`;
        let cardId = card._id;
        let tempoCost = card.data.data.tempoCost;
        let actorId = this.actor._id;
        if (tempoCost.includes('X')) {
            xSetBox.instance.renderRollBox(heading, cardId, tempoCost, actorId);
        } else {
            let tempoObject = this.createTempoObject(card, tempoCost, 0);
            this.asyncCardPlaying(card, tempoObject);
        };
    };

    createTempoObject(card, tempo, xValue) {
        if (tempo.includes('X')) {
            let tempoIsX = tempo === 'X';
            tempo = tempo.replace('X', xValue);
            // only parses addition
            if (!tempoIsX && tempo.includes('+')) {
                let tempoComponents = tempo.split('+');
                let tempoTotal = 0;
                for (let i = 0; i < tempoComponents.length; i++) {
                    tempoTotal += Number(tempoComponents[i]);     
                };
                tempo = tempoTotal;
            };
        };

        // check if Fervor exists and applies
        if (card.checkIfCardHasFervor()) {
            let actorMaxResolve = this.actor.system.resolve.max;
            let actorCurrentResolve = this.actor.system.resolve.value;
            if (actorCurrentResolve <= (actorMaxResolve / 2)) {
                tempo -= 1;
            };
        };
        
        return {
            tempo: Number(tempo),
            xValue: Number(xValue),
        };
    };

    async asyncCardPlaying(card, tempoCostData) {
        let enoughTempo = await this.checkIfEnoughTempo(tempoCostData.tempo);
        if (!enoughTempo) {
            this.reportInsufficientTempo(card);
            return;
        } else {
            this.playOrDiscardMessage(card, 'play', tempoCostData);
            this.playCard(card, tempoCostData.xValue);
            this.updateTempo(tempoCostData.tempo);
            let cardType = card.type;
            if (cardType === 'card') {
                this.discardCard(card);
            };
        };
    };

    // set up to be called by Activate Listeners
    async playOrDiscardMessage(card, playOrDiscard, tempoCostData) {
        const token = this.actor.token;
        let tempoCostPortion = '';
        let xPortion = '';
        if (playOrDiscard === 'play') {
            tempoCostPortion = ` for ${tempoCostData.tempo} Tempo`;
            if (tempoCostData.xValue) {
                xPortion = ` (X = ${tempoCostData.xValue})`;
            };
        };
        
        const chatData = {
            user: game.user.data._id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: `${card.name} was ${playOrDiscard}ed ${tempoCostPortion}${xPortion}`,
            speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
        };
        return ChatMessage.create(chatData);
    };

    async discardCard(card) {
        let cardId = card._id;
        let itemChange = [{_id: cardId, 'data.currentLocation': 'discard'}];
        await this.actor.updateEmbeddedDocuments('Item', itemChange);
    };

    async checkIfEnoughTempo(tempoCost) {
        let currentTempo = Number(this.actor.data.data.tempo.value);
        return currentTempo >= tempoCost;
    };

    async reportInsufficientTempo(card) {
        const token = this.actor.token;
        const chatData = {
            user: game.user.data._id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: `Not enough Tempo to play ${card.name}`,
            speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
        };
        return ChatMessage.create(chatData);
    };

    async updateTempo(tempoCost) {
        let currentTempo = this.actor.data.data.tempo.value;
        let newTempo = currentTempo - tempoCost;
        await this.actor.update({'data.tempo.value': newTempo});
    };

    // set up to be called by Activate Listeners
    async playCard(card, xValue) {
        card.displayCard('systems/worldbuilding/templates/combat-card.html', xValue);
    };

    // set up to be called by Activate Listeners
    toggleCardDetail(event) {
        let sectionToToggle;
        if (Array.from(event.target.classList).includes('cardNameSection')) {
            sectionToToggle = event.target.parentElement.children[1];
        } else {
            // for children of cardNameSection
            sectionToToggle = event.target.parentElement.parentElement.children[1];
        };
        sectionToToggle.classList.toggle('hideCardDetail');
    };

    // set up to be called by Activate Listeners
    async countCardsInDeck() {
        let cardsInDeck = this.actor.items._source.filter(item => item.data.inCombatDeck);
        let numberOfCardsInDeck = cardsInDeck.length;
        await this.actor.update({'data.deckCount.value' : numberOfCardsInDeck});
    };

    // set up to be called by Activate Listeners
    async seekCard(event) {
        let cardId = event.target.parentElement.dataset.id;
        let itemChange = [{_id: cardId, 'data.currentLocation': 'hand'}];
        await this.actor.updateEmbeddedDocuments('Item', itemChange);
    }
};


class DukhlonActor extends Actor {
    prepareDerivedData() {
        super.prepareDerivedData();
    };

    async resetTempo() {
        let maxTempo = this.data.data.tempo.max;
        await this.update({'data.tempo.value': maxTempo});
    };
};

// Roll Box

class DukhlonForm extends FormApplication {

    constructor(object, options) {
        super(object, options);
    };

    static get defaultOptions() {
        const defaults = super.defaultOptions;
      
        const overrides = {
          width: 500,
        };
      
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
        
        return mergedOptions;
    };

    getData(options = {}) {
        return super.getData().object;
    };

    static instantiate() {
        RollBox.instance = new RollBox();
    };

    _updateObject() {
        console.log('done');
    };
};

class RollBox extends DukhlonForm {

    constructor(object, options) {
        super(object, options);
    };

    activateListeners(html) {
        document.querySelector('.publicRollButton').addEventListener('click', (click) => {
            click.preventDefault();
            let advantageObject = this.getAdvantagesAndDisadvantages(click.target);
            this.performRoll(click.target, advantageObject, 'publicroll');
            let closeButton = click.target.parentElement.parentElement.parentElement.parentElement.children[0].children[1];
            closeButton.dispatchEvent(new Event('click'));
        });
        document.querySelector('.gmRollButton').addEventListener('click', (click) => {
            click.preventDefault();
            let advantageObject = this.getAdvantagesAndDisadvantages(click.target);
            this.performRoll(click.target, advantageObject, 'gmroll');
            let closeButton = click.target.parentElement.parentElement.parentElement.parentElement.children[0].children[1];
            closeButton.dispatchEvent(new Event('click'));
        });
        document.querySelector('.secretRollButton').addEventListener('click', (click) => {
            click.preventDefault();
            let advantageObject = this.getAdvantagesAndDisadvantages(click.target);
            this.performRoll(click.target, advantageObject, 'blindroll');
            let closeButton = click.target.parentElement.parentElement.parentElement.parentElement.children[0].children[1];
            closeButton.dispatchEvent(new Event('click'));
        });
    };

    getAdvantagesAndDisadvantages(rollButton) {
        let form = rollButton.parentElement.parentElement;
        let advantages;
        let disadvantages;
        for (let key in form) {
            if (!form[key]) {
                continue;
            };
            if (form[key].id === 'advantageInput') {
                advantages = form[key].value;
            } else if (form[key].id === 'disadvantageInput') {
                disadvantages = form[key].value;
            };
        };
        if (!advantages) {
            advantages = 0;
        } else {
            advantages = Number(advantages);
        }
        if (!disadvantages) {
            disadvantages = 0;
        } else {
            disadvantages = Number(disadvantages);
        };
        return {
            advantages,
            disadvantages,
        };
    };

    static instantiate() {
        RollBox.instance = new RollBox();
    };

    _updateObject() {
        console.log('done');
    };
};

// Skill Roll Box

class SkillRollBox extends RollBox {

    constructor(object, options) {
        super(object, options);
    };

    static get defaultOptions() {
        const defaults = super.defaultOptions;
      
        const overrides = {
          template: "systems/worldbuilding/templates/skill-test-box.html",
        };
      
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
        
        return mergedOptions;
    };

    activateListeners(html) {
        super.activateListeners(html);
    };

    async renderRollBox(actorName, skillName, skillProficiency) {
        let contraction = ('AEIOU'.includes(skillName[0])) ? 'an' : 'a';
        let templateFile = "systems/worldbuilding/templates/skill-test-box.html";
        let templateData = {
            heading: `Perform ${contraction} ${skillName} (${skillProficiency}) Test`,
            actorName,
            skillName, 
            skillProficiency,
        };
        let templateRender = new SkillRollBox(templateData, { template: templateFile});
        let res = await templateRender.render(true);
    };

    performRoll(button, advantageObject, rollMode) {
        let form = button.parentElement.parentElement;
        let actorName = form.getAttribute('data-sender')
        let skillName = form.getAttribute('data-skillName');
        let proficiency = Number(form.getAttribute('data-skillProficiency'));
        let advantages = advantageObject.advantages;
        let disadvantages = advantageObject.disadvantages;

        // create the foundry roll formula
        let numberOfD6 = proficiency + advantages - disadvantages;
        let formula = `${numberOfD6}d6`;
        let roll = new Roll(formula);
        // create message
        let text = `${actorName} Performs the ${skillName} Test`;
        roll.toMessage({
            flavor: text,
        }, {
            rollMode: rollMode,
        });
        
        // uses default speaker
    };

    static instantiate() {
        SkillRollBox.instance = new SkillRollBox();
    };
};


// Combat Roll Box

class CombatRollBox extends RollBox {

    constructor(object, options) {
        super(object, options);
    };

    static get defaultOptions() {
        const defaults = super.defaultOptions;
      
        const overrides = {
          template: "systems/worldbuilding/templates/combat-roll-box.html",
        };
      
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
        
        return mergedOptions;
    };

    activateListeners(html) {
        super.activateListeners(html);
    };


    // set up to be called by chat click
    async rollFromChat(event) {
        let actorId = event.target.getAttribute('data-actorId');
        let xValue = event.target.getAttribute('data-xValue');
        let actor = game.actors.get(actorId);
        if (!DukhlonActorSheet.instance.hasUserActorPerms(actor)) {
            return;
        };
        let chatMessage = event.target.parentElement.parentElement.parentElement;
        let sender = chatMessage.children[0].children[0].innerText;
        let cardTitleContainer = chatMessage.children[1].children[0].children[0];
        let cardName = `${cardTitleContainer.children[0].innerText}_${cardTitleContainer.children[1].innerText}`;
        cardName = cardName.split(' ').join('_');
        let formula = event.target.getAttribute('data-roll');
        if (formula.includes('X')) {
            formula = formula.replace('X', xValue);
        };
        this.renderRollBox(sender, cardName, formula);

    };

    async renderRollBox(sender, cardName, formula) {
        let templateFile = "systems/worldbuilding/templates/combat-roll-box.html";
        let templateData = {
            heading: `Roll ${formula} for ${cardName.replace('_', ' ')}`,
            actorName: sender,
            cardPlayed: cardName,
            rollFormula: formula,
        };
        let templateRender = new CombatRollBox(templateData, { template: templateFile});
        let res = await templateRender.render(true);
    };

    async performRoll(button, advantageObject, rollMode) {
        let form = button.parentElement.parentElement;
        let sender = form.getAttribute('data-sender');
        let cardName = form.getAttribute('data-card').replaceAll('_', ' ');
        let advantages = advantageObject.advantages;
        let disadvantages = advantageObject.disadvantages;
        let formula = form.getAttribute('data-formula');
        formula = formula.replace('d6', '');
        let newFormula = eval(formula);
        newFormula += advantages;
        newFormula -= disadvantages;
        let roll = new Roll(`${newFormula}d6`);
        roll.toMessage({
            flavor: `${sender} rolls (${formula} + ${advantages} - ${disadvantages})d6 for ${cardName}`,
        }, {
            rollMode: rollMode,
        });
    };

    static instantiate() {
        CombatRollBox.instance = new CombatRollBox();
    };
};


// X Set Box Box

class xSetBox extends DukhlonForm {

    constructor(object, options) {
        super(object, options);
    };

    static get defaultOptions() {
        const defaults = super.defaultOptions;
      
        const overrides = {
          template: "systems/worldbuilding/templates/x-set-box.html",
        };
      
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
        
        return mergedOptions;
    };

    // this method throws an error if it the super's version is called
    activateListeners(html) {
        super.activateListeners(html);
        document.querySelector('.xSetSubmitButton').addEventListener('click', (event) => {
            let form = event.target.parentElement.parentElement;
            let xValue = form.children[1].children[1].value;
            let cardId = form.getAttribute('data-card-id');
            let actorId = form.getAttribute('data-actor-id');
            let tempoCost = form.getAttribute('data-tempo');
            if (isNaN(Number(xValue))) {
                let heading = 'Please enter a number for X'
                xSetBox.instance.renderRollBox(heading, cardId, tempoCost, actorId);
            } else {
                this.setX(cardId, tempoCost, actorId, xValue);
            };
        });
    };

    async renderRollBox(heading, cardId, tempoCost, actorId) {
        let templateFile = "systems/worldbuilding/templates/x-set-box.html";
        let templateData = {
            heading,
            cardId,
            tempoCost,
            actorId,
        };
        let templateRender = new xSetBox(templateData, { template: templateFile});
        let res = await templateRender.render(true);
    };

    setX(cardId, tempoCost, actorId, xValue) {
        let actor = game.actors.get(actorId);
        let card = actor.items.get(cardId);
        let actorSheet = actor._sheet;
        let tempoObject = actorSheet.createTempoObject(card, tempoCost, xValue);
        actorSheet.asyncCardPlaying(card, tempoObject);
    };

    static instantiate() {
        xSetBox.instance = new xSetBox();
    };
};


// Item Sheet

class DukhlonItemSheet extends ItemSheet {
    static get defaultOptions() {
        const defaults = super.defaultOptions;
      
        const overrides = {
          width: 500,
          height: 320,
          template: "systems/worldbuilding/templates/item-sheet.html",
        };
      
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
        
        return mergedOptions;
    };

    getData() {
        const context = super.getData();
        context.systemData = context.data.data;
        return context;
    };
};

class DukhlonItem extends Item {

    prepareDerivedData() {
        super.prepareDerivedData();
    };

    async displayCard(templatePath, xValue) {
        const token = this.actor.token;
        const templateData = {
            actor: this.actor.data,
            item: this.data,
            data: this,
            xValue: xValue,
        };
        const templateToDisplay = await renderTemplate(templatePath, templateData);
        const chatData = {
            user: game.user.data._id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: templateToDisplay,
            speaker: ChatMessage.getSpeaker({actor: this.actor, token}),
            flags: {chatRoll: templateData.data.system.roll},
        };
        return ChatMessage.create(chatData);
    };

    checkIfCardHasFervor() {
        let keyword = this.system.keyword;
        let hasFervor = keyword && keyword.includes('Fervor');
        return hasFervor;
    };
};

// set up to be called by on render hook
async function renderChatCard(html) {
    if (html.data.title === 'Play Card') {
        let content = html.data.content;
        let re = new RegExp('src=\\".+?"');
        let match = content.match(re);
        const templateData = {
            src: match[0].slice(5, match[0].length - 1),
        };
        const templateToDisplay = await renderTemplate('systems/worldbuilding/templates/card-chat-card.html', templateData);
        const chatData = {
            user: game.user.data._id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: templateToDisplay,
        };
        return ChatMessage.create(chatData);
    };
};


Hooks.once('init', () => {

    // set classes
    CONFIG.Actor.documentClass = DukhlonActor;
    CONFIG.Item.documentClass = DukhlonItem;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("worldbuilding", DukhlonActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("worldbuilding", DukhlonItemSheet, { makeDefault: true });
});


// Instantiate Objects

Hooks.on('init', () => DukhlonActorSheet.instantiate());
Hooks.on('init', () => RollBox.instantiate());
Hooks.on('init', () => SkillRollBox.instantiate());
Hooks.on('init', () => CombatRollBox.instantiate());
Hooks.on('init', () => xSetBox.instantiate());


// Calculate Actor Load

Hooks.on('renderDukhlonActorSheet', (html) => {
    DukhlonActorSheet.instance.calculateCurrentLoad(html);
    DukhlonActorSheet.instance.calculateSkillDCs(html);
});


// play card to chat
Hooks.on('renderDialog', (html) => {
    renderChatCard(html);
});

// set listeners to refresh tempo on next round
Hooks.on('renderCombatTracker', (html) => {
    let startCombatButtonArray = Array.from(document.getElementsByClassName('combat-control center'));
    startCombatButtonArray.forEach((button) => button.addEventListener('click', (event) => {
        let combatantsArray = game.combat.data.combatants._source;
        combatantsArray.forEach((combatant) => {
            let actorId = combatant.actorId;
            let actor = game.actors.get(actorId);
            actor.resetTempo();
        });
    }));
    let nextRoundButtonArray = Array.from(document.getElementsByClassName('fas fa-step-forward'));
    nextRoundButtonArray.forEach((button) => button.addEventListener('click', (event) => {
        let combatantsArray = game.combat.data.combatants._source;
        combatantsArray.forEach((combatant) => {
            let actorId = combatant.actorId;
            let actor = game.actors.get(actorId);
            actor.resetTempo();
        });
    }));
});

// set roll listener
Hooks.on('renderChatLog', (app, html, data) => {
    html.on('click', '.combatCardChatRoll', (event) => CombatRollBox.instance.rollFromChat(event));
});