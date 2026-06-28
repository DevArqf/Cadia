const { AllFlowsPrecondition } = require('@sapphire/framework');
class EveryonePrecondition extends AllFlowsPrecondition {
	chatInputRun() {
		return this.ok();
	}

	contextMenuRun() {
		return this.ok();
	}

	messageRun() {
		return this.ok();
	}
}

module.exports = {
	EveryonePrecondition
};
