
class Validator {
    escapeRegex = (string) => {
        if (string == null || string == "") return "";
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    mobileValidator = {
        validator: function (value) {
            return /^[0-9]{10}$/.test(value)
        },
        message: (props) => `${props.value} is not a valid mobile number!`
    }
    
    emailValidator = {
        validator: function (value) {
            if (!value) return true; // Allow null or empty string
            return /^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/.test(value);
        },
        message: (props) => `${props.value} is not a valid email address!`
    };

    validate(requiredFields, body) {
        if (requiredFields.includes('mobile') && body?.mobile.toString().length != 10) {
            return `Check Your MobileNumber`
        }
        if (requiredFields.includes('email') && !body?.email.toString().includes("@gmail.com")) {
            return `Check Your Email Id`
        }
        const missingFields = requiredFields.filter(
            (field) =>
                !body.hasOwnProperty(field) ||
                body[field] === '' ||
                body[field] === null ||
                body[field] === undefined ||
                (Array.isArray(body[field]) && body[field].length === 0)
        );
        if (missingFields.length > 0) {
            return `Missing required fields: ${missingFields.join(",")}`;
        } else {
            return null;
        }
    }
}

module.exports = Validator