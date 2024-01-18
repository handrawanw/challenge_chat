const rlp = require('readline');

const rl = rlp.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(description) {
    return new Promise(resolve => {
        rl.question(description, input => resolve(input));
    });
}

module.exports={
    ask
}