const fs = require('fs');
const path = 'd:/Program/Kiwoom/server.js';
let s = fs.readFileSync(path, 'utf8');

// Fix the "} } catch" syntax error
const badStr = '} } catch (e) {';
const goodStr = '} catch (e) {';

if (s.includes(badStr)) {
    s = s.replace(badStr, goodStr);
    fs.writeFileSync(path, s);
    console.log('Fixed redundant brace successfully!');
} else {
    console.log('Error: Could not find "} } catch (e) {" in server.js');
}
