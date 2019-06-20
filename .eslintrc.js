module.exports = {
    "extends": ["airbnb-base", "plugin:jest/recommended"],
    "parserOptions": {
    	"ecmaVersion": 2017,
    },
    "env": {
        "jest/globals": true
    },
    "plugins": ["jest"],
    "rules": {
        "semi": ["warn", "never"],
        "no-underscore-dangle": "off",
        "arrow-parens": "off",
        "comma-dangle": "off"
    }
};
