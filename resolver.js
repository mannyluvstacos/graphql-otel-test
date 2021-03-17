const Query = {
    getSimple(parent, args, context, info){

        console.log({context})

        return {
            foo: 'I am foo!',
            bar: 'I am bar!'
        }
    }
}