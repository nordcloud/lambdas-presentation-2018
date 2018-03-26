module.exports = {
  "extends": "airbnb",
  "plugins": [],
  "rules": {
    "func-names": "off",

    // doesn't work in node v4 :(
    "strict": "off",
    "prefer-rest-params": "off",
    "react/require-extension" : "off",
    "import/no-extraneous-dependencies" : "off",

    // Tidy things up for Node.js
    // "arrow-body-style": ["error", "always"]
    "no-multi-str": "off",
    "no-use-before-define": "off",
    "brace-style": [2, "stroustrup", { "allowSingleLine": true }],
  },
  "env": {
       "mocha": true
   }
};

