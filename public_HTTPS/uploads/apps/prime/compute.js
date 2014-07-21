var n = 1;

function isPrime (n)
{
	if (n < 2) return false;

	var q = parseInt(Math.sqrt(n));
	for (var i = 2; i <= q; i++)
	{
		if (n % i == 0)
		{
			return false;
		}
	}
	return true;
}

self.addEventListener('message', function(e) {
	if (e.data && e.data>0) {
		// receive the last prime value
		n = e.data;
		var found = false
		while (!found) {
			n += 1;
			if (isPrime(n)) {
				// found a prime!
				found = true;
			}
		}
		// send the new prime back to master
		postMessage(n);
		return;
	}
	if (e.data && e.data===0) {
		// Got the quit signal
		self.close();
		return;
	}
}, false);
